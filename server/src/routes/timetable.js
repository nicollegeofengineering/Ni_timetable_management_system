import express from "express";
import { connectDB } from "../config/db.js";
const router = express.Router();

import Timetable from "../models/Timetable.model.js";
import Subject from "../models/Subjects.model.js";
import Staff from "../models/Staff.model.js";
import Hall from "../models/Hall.model.js";

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
    await connectDB();

    const { academicYear, department, year } = req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "academicYear is required",
      });
    }

    const filter = { academicYear };
    if (department) filter.department = department.toUpperCase();
    if (year) filter.year = parseInt(year);

    const data = await fetchTimetableWithPopulate(filter);

    res.status(200).json({
      success: true,
      data,
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
    await connectDB();

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

    if (![1, 2].includes(semesterNum)) {
      return res.status(400).json({ success: false, message: "semester must be 1 or 2" });
    }
    if (dayNum < 1 || dayNum > 7) {
      return res.status(400).json({ success: false, message: "day must be 1-7" });
    }
    if (periodNum < 1 || periodNum > 7) {
      return res.status(400).json({ success: false, message: "period must be 1-7" });
    }

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

    const filter = {
      academicYear,
      department: deptUpper,
      year: yearNum,
      semester: semesterNum,
      day: dayNum,
      period: periodNum,
    };

    const existing = await Timetable.findOne(filter);

    // ---------- Conflict Validation ----------

    // 1. Staff conflict — but SKIP if the conflicting slot has the same subject.
    // Same subject + same staff at the same slot = common class shared across
    // departments (e.g. two branches taught together), not a real conflict.
    if (staff) {
      const staffConflictQuery = {
        academicYear,
        staff,
        day: dayNum,
        period: periodNum,
        _id: { $ne: existing?._id },
      };
      if (subject) {
        staffConflictQuery.subject = { $ne: subject };
      }

      const staffConflict = await Timetable.findOne(staffConflictQuery);
      if (staffConflict) {
        const staffDoc = await Staff.findById(staff);
        const staffName = staffDoc ? staffDoc.staffName : staff;
        return res.status(409).json({
          success: false,
          conflict: "staff",
          message: `Staff "${staffName}" is already assigned to ${staffConflict.department} ${staffConflict.year} (Sem ${staffConflict.semester}) on day ${dayNum}, period ${periodNum}`,
        });
      }
    }

    // 2. Hall conflict (unchanged)
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

    // 3. Class conflict (unchanged)
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

// ---------- DELETE /api/timetable/cell ----------
// Deletes ONE period cell for ONE class. Fully scoped, no accidental wipes.
router.delete("/cell", async (req, res) => {
  try {
    await connectDB();

    const { academicYear, department, year, semester, day, period } = req.query;

    if (!academicYear || !department || !year || !semester || !day || !period) {
      return res.status(400).json({
        success: false,
        message: "academicYear, department, year, semester, day, and period are all required",
      });
    }

    const filter = {
      academicYear,
      department: department.toUpperCase(),
      year: parseInt(year),
      semester: parseInt(semester),
      day: parseInt(day),
      period: parseInt(period),
    };

    const result = await Timetable.deleteOne(filter);

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No entry found for that cell" });
    }

    res.status(200).json({
      success: true,
      message: "Cell cleared",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting cell:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- DELETE /api/timetable/row ----------
// Deletes every period in ONE day for ONE class (a whole row).
router.delete("/row", async (req, res) => {
  try {
    await connectDB();

    const { academicYear, department, year, semester, day } = req.query;

    if (!academicYear || !department || !year || !semester || !day) {
      return res.status(400).json({
        success: false,
        message: "academicYear, department, year, semester, and day are all required",
      });
    }

    const filter = {
      academicYear,
      department: department.toUpperCase(),
      year: parseInt(year),
      semester: parseInt(semester),
      day: parseInt(day),
    };

    const result = await Timetable.deleteMany(filter);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} entries for that day`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting row:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- DELETE /api/timetable/class ----------
// Deletes the FULL timetable for ONE class (dept + year + semester).
// Deliberately requires every field — no wildcard "delete all for academicYear".
router.delete("/class", async (req, res) => {
  try {
    await connectDB();

    const { academicYear, department, year, semester } = req.query;

    if (!academicYear || !department || !year || !semester) {
      return res.status(400).json({
        success: false,
        message: "academicYear, department, year, and semester are all required",
      });
    }

    const filter = {
      academicYear,
      department: department.toUpperCase(),
      year: parseInt(year),
      semester: parseInt(semester),
    };

    const result = await Timetable.deleteMany(filter);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} entries for this class`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting class timetable:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- GET /api/timetable/subject-reference ----------
router.get("/subject-reference", async (req, res) => {
  try {
    await connectDB();

    const { academicYear, department, year } = req.query;
    if (!academicYear || !department || !year) {
      return res.status(400).json({
        success: false,
        message: "academicYear, department, and year are required",
      });
    }

    const deptUpper = department.toUpperCase();
    const yearNum = parseInt(year);

    const entries = await Timetable.find({
      academicYear,
      department: deptUpper,
      year: yearNum,
    })
      .populate("subject", "subjectName subjectCode Category")
      .populate("staff", "staffName staffCode staffId facultyId")
      .lean();

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

// ---------- GET /api/timetable/staff-view ----------
router.get("/staffview", async (req, res) => {
  try {
    await connectDB();

    const { academicYear,staffId, search } = req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "academicYear and semester are required",
      });
    }


    // Base filter
    const filter = {
      academicYear,
    };

    // If staffId is given, fetch only that staff
    if (staffId) {
      filter.staff = staffId;
    }

    const entries = await Timetable.find(filter)
      .populate("subject", "subjectName subjectCode Category")
      .populate("staff", "staffName staffCode staffId facultyId")
      .populate("hall", "hallName")
      .lean();

    // If a search query is provided, filter staff after population
    if (search) {
      const q = search.toUpperCase();
      const filtered = entries.filter(entry => {
        if (!entry.staff) return false;
        return (
          entry.staff.staffName?.toUpperCase().includes(q) ||
          entry.staff.staffCode?.toUpperCase().includes(q)
        );
      });
      return res.status(200).json({ success: true, data: filtered });
    }

    // Otherwise return all entries (grouping will be done on frontend)
    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (err) {
    console.error("Error fetching staff view:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- GET /api/timetable/hallview ----------
router.get("/hallview", async (req, res) => {
  try {
    await connectDB();

    const { academicYear, hallId, search } = req.query;

    if (!academicYear) {
      return res.status(400).json({
        success: false,
        message: "academicYear is required",
      });
    }

    const filter = { academicYear };

    if (hallId) {
      filter.hall = hallId;
    }

    let entries = await Timetable.find(filter)
      .populate("subject", "subjectName subjectCode Category")
      .populate("staff", "staffName staffCode staffId facultyId")
      .populate("hall", "hallName hallCode")
      .lean();

    // If search query is provided, filter by hall name/code after population
    if (search) {
      const q = search.toUpperCase();
      entries = entries.filter(entry => {
        if (!entry.hall) return false;
        return (
          entry.hall.hallName?.toUpperCase().includes(q) ||
          entry.hall.hallCode?.toUpperCase().includes(q)
        );
      });
    }

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (err) {
    console.error("Error fetching hall view:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;