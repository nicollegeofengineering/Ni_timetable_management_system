import express from "express";
const router = express.Router();
import { connectDB } from "../config/db.js"; // <-- added import

import Staff_db from "../models/Staff.model.js";
import Department_db from "../models/Department.model.js";

/**
 * GET /api/staff/all
 * Query params:
 *   page      - number (default 1)
 *   limit     - number (default 10)
 *   department - department ObjectId (optional) – filter by department
 *   search    - string (optional) – search in staffName only (case-insensitive)
 */
router.get("/all", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.search && req.query.search.trim()) {
      filter.staffName = { $regex: req.query.search.trim(), $options: "i" };
    }

    const [staff, total] = await Promise.all([
      Staff_db.find(filter)
        .populate("department", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Staff_db.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: staff,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/staff/:id
 * Fetch a single staff by ID
 */
router.get("/:id", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { id } = req.params;
    const staff = await Staff_db.findById(id).populate("department", "name code");
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }
    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (err) {
    console.error("Error fetching staff:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/staff/
 * Create a new staff member
 * Required fields: staffName, staffCode, staffId, facultyId, department
 */
router.post("/", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { staffName, staffCode, staffId, facultyId, department } = req.body;

    if (!staffName || !staffCode || !staffId || !facultyId || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields (staffName, staffCode, staffId, facultyId, department) are required",
      });
    }

    const deptExists = await Department_db.findById(department);
    if (!deptExists) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    const existing = await Staff_db.findOne({
      $or: [{ staffCode }, { staffId }, { facultyId }],
    });

    if (existing) {
      let duplicateField = "";
      if (existing.staffCode === staffCode) duplicateField = "staffCode";
      else if (existing.staffId === staffId) duplicateField = "staffId";
      else if (existing.facultyId === facultyId) duplicateField = "facultyId";

      return res.status(409).json({
        success: false,
        message: `${duplicateField} already exists: ${existing[duplicateField]}`,
      });
    }

    const newStaff = new Staff_db({
      staffName,
      staffCode,
      staffId,
      facultyId,
      department,
    });

    await newStaff.save();
    await newStaff.populate("department", "name code");

    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      data: newStaff,
    });
  } catch (err) {
    console.error("Error creating staff:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PUT /api/staff/:id
 * Update a staff member (staffCode cannot be changed)
 * Allowed fields: staffName, staffId, facultyId, department
 */
router.put("/:id", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { id } = req.params;
    const { staffName, staffId, facultyId, department } = req.body;

    const existingStaff = await Staff_db.findById(id);
    if (!existingStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const updateData = {};

    if (staffName) updateData.staffName = staffName;
    if (staffId && staffId !== existingStaff.staffId) {
      const duplicate = await Staff_db.findOne({ staffId });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `staffId already exists: ${staffId}`,
        });
      }
      updateData.staffId = staffId;
    }

    if (facultyId && facultyId !== existingStaff.facultyId) {
      const duplicate = await Staff_db.findOne({ facultyId });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `facultyId already exists: ${facultyId}`,
        });
      }
      updateData.facultyId = facultyId;
    }

    if (department) {
      const deptExists = await Department_db.findById(department);
      if (!deptExists) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }
      updateData.department = department;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const updatedStaff = await Staff_db.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("department", "name code");

    res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: updatedStaff,
    });
  } catch (err) {
    console.error("Error updating staff:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * DELETE /api/staff/:id
 * Delete a staff member by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { id } = req.params;
    const deletedStaff = await Staff_db.findByIdAndDelete(id);

    if (!deletedStaff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff deleted successfully",
      data: deletedStaff,
    });
  } catch (err) {
    console.error("Error deleting staff:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;