import express from "express";
const router = express.Router();

import Timetable from "../models/Timetable.model.js";
import Subject from "../models/Subjects.model.js";
import Staff from "../models/Staff.model.js";
import Hall from "../models/Hall.model.js";

// ---------- In‑memory cache ----------
let timetableCache = null;
let cacheAcademicYear = null;

const clearCache = () => {
  timetableCache = null;
  cacheAcademicYear = null;
  console.log("Timetable cache cleared");
};

// Helper to fetch with population
const fetchTimetableWithPopulate = async (filter) => {
  return await Timetable.find(filter)
    .populate("subject", "subjectName subjectCode Category")
    .populate("staff", "staffName staffCode staffId facultyId")
    .populate("hall", "hallName capacity")
    .lean();
};

// ---------- GET /api/timetable/all ----------
router.get("/all", async (req, res) => {
  try {
    const { academicYear, department, year } = req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "academicYear is required",
      });
    }

    // Build filter
    const filter = { academicYear };
    if (department) filter.department = department.toUpperCase();
    if (year) filter.year = parseInt(year);

    // Check cache
    if (timetableCache && cacheAcademicYear === academicYear) {
      // Filter cached data if needed
      let data = timetableCache;
      if (department) {
        data = data.filter((item) => item.department === department.toUpperCase());
      }
      if (year) {
        data = data.filter((item) => item.year === parseInt(year));
      }
      return res.status(200).json({
        success: true,
        data,
        cached: true,
      });
    }

    // Fetch from DB with population
    const data = await fetchTimetableWithPopulate(filter);

    // Update cache
    timetableCache = data;
    cacheAcademicYear = academicYear;

    res.status(200).json({
      success: true,
      data,
      cached: false,
    });
  } catch (err) {
    console.error("Error fetching timetable:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ---------- PUT /api/timetable/upsert ----------
router.put("/upsert", async (req, res) => {
  try {
    const {
      academicYear,
      department,
      year,
      semester,
      day,
      period,
      subject,
      staff,
      hall,
    } = req.body;

    // Validate required fields
    if (!academicYear || !department || !year || !semester || !day || !period) {
      return res.status(400).json({
        success: false,
        message: "academicYear, department, year, semester, day, and period are required",
      });
    }

    const deptUpper = department.toUpperCase();
    const yearNum = parseInt(year);
    const semesterNum = parseInt(semester);
    const dayNum = parseInt(day);
    const periodNum = parseInt(period);

    // Validate semester/day/period ranges
    if (![1, 2].includes(semesterNum)) {
      return res.status(400).json({ success: false, message: "semester must be 1 or 2" });
    }
    if (dayNum < 1 || dayNum > 7) {
      return res.status(400).json({ success: false, message: "day must be 1-7" });
    }
    if (periodNum < 1 || periodNum > 7) {
      return res.status(400).json({ success: false, message: "period must be 1-7" });
    }

    // Optional: check if subject/staff/hall exist (if provided)
    if (subject) {
      const subExists = await Subject.findById(subject);
      if (!subExists) {
        return res.status(404).json({ success: false, message: "Subject not found" });
      }
    }
    if (staff) {
      const staffExists = await Staff.findById(staff);
      if (!staffExists) {
        return res.status(404).json({ success: false, message: "Staff not found" });
      }
    }
    if (hall) {
      const hallExists = await Hall.findById(hall);
      if (!hallExists) {
        return res.status(404).json({ success: false, message: "Hall not found" });
      }
    }

    // Build filter for existing document (to check conflicts)
    const filter = {
      academicYear,
      department: deptUpper,
      year: yearNum,
      semester: semesterNum,
      day: dayNum,
      period: periodNum,
    };

    // Find existing entry for this cell (if any)
    const existing = await Timetable.findOne(filter);

    // ---------- Conflict Validation ----------
    // 1. Staff conflict (if staff is provided)
    if (staff) {
      const staffConflict = await Timetable.findOne({
        academicYear,
        staff,
        day: dayNum,
        period: periodNum,
        _id: { $ne: existing?._id }, // exclude current entry
      });
      if (staffConflict) {
        // Fetch staff name for message
        const staffDoc = await Staff.findById(staff);
        const staffName = staffDoc ? staffDoc.staffName : staff;
        return res.status(409).json({
          success: false,
          conflict: "staff",
          message: `Staff "${staffName}" is already assigned to ${staffConflict.department} ${staffConflict.year} (Sem ${staffConflict.semester}) on day ${dayNum}, period ${periodNum}`,
        });
      }
    }

    // 2. Hall conflict (if hall is provided)
    if (hall) {
      const hallConflict = await Timetable.findOne({
        academicYear,
        hall,
        day: dayNum,
        period: periodNum,
        _id: { $ne: existing?._id },
      });
      if (hallConflict) {
        const hallDoc = await Hall.findById(hall);
        const hallName = hallDoc ? hallDoc.hallName : hall;
        return res.status(409).json({
          success: false,
          conflict: "hall",
          message: `Hall "${hallName}" is already booked for ${hallConflict.department} ${hallConflict.year} (Sem ${hallConflict.semester}) on day ${dayNum}, period ${periodNum}`,
        });
      }
    }

    // 3. Class conflict: same department/year already has another subject in this slot
    if (subject) {
      const classConflict = await Timetable.findOne({
        academicYear,
        department: deptUpper,
        year: yearNum,
        semester: semesterNum,
        day: dayNum,
        period: periodNum,
        _id: { $ne: existing?._id },
      });
      if (classConflict) {
        return res.status(409).json({
          success: false,
          conflict: "class",
          message: `This class (${deptUpper} ${yearNum}, Sem ${semesterNum}) already has a subject in day ${dayNum}, period ${periodNum}`,
        });
      }
    }

    // ---------- Upsert ----------
    const updateData = {};
    if (subject !== undefined) updateData.subject = subject || null;
    if (staff !== undefined) updateData.staff = staff || null;
    if (hall !== undefined) updateData.hall = hall || null;

    const options = {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    };

    const updated = await Timetable.findOneAndUpdate(filter, updateData, options)
      .populate("subject", "subjectName subjectCode Category")
      .populate("staff", "staffName staffCode staffId facultyId")
      .populate("hall", "hallName capacity");

    // Clear cache
    clearCache();

    res.status(200).json({
      success: true,
      data: updated,
      message: "Timetable entry saved successfully",
    });
  } catch (err) {
    console.error("Error upserting timetable:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ---------- DELETE /api/timetable/:id ----------
// ---------- DELETE /api/timetable/clear ----------
// Clear all timetable entries for a given academic year
// Query params: academicYear (required), department (optional), year (optional)
router.delete("/clear", async (req, res) => {
  try {
    const { academicYear, department, year } = req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "academicYear is required",
      });
    }

    // Build filter
    const filter = { academicYear };
    if (department) filter.department = department.toUpperCase();
    if (year) filter.year = parseInt(year);

    const result = await Timetable.deleteMany(filter);

    // Clear cache
    clearCache();

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} timetable entries`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error clearing timetable:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- GET /api/timetable/subject-reference ----------
router.get("/subject-reference", async (req, res) => {
  try {
    const { academicYear, department, year } = req.query;
    if (!academicYear || !department || !year) {
      return res.status(400).json({
        success: false,
        message: "academicYear, department, and year are required",
      });
    }

    const deptUpper = department.toUpperCase();
    const yearNum = parseInt(year);

    // Find all entries for that class
    const entries = await Timetable.find({
      academicYear,
      department: deptUpper,
      year: yearNum,
    })
      .populate("subject", "subjectName subjectCode Category")
      .populate("staff", "staffName staffCode staffId facultyId")
      .lean();

    // Build unique pairs of (subject, staff)
    const pairMap = new Map();
    entries.forEach((entry) => {
      if (!entry.subject || !entry.staff) return;
      const key = `${entry.subject._id}|${entry.staff._id}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, {
          subject: entry.subject,
          staff: entry.staff,
        });
      }
    });

    const data = Array.from(pairMap.values());

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error fetching subject reference:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;