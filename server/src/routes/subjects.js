import express from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js"; // <-- added import
const router = express.Router();

import Subject_db from "../models/Subjects.model.js";

/**
 * GET /api/subject/all
 * Query params:
 *   page      - number (default 1)
 *   limit     - number (default 10)
 *   search    - string (optional) – search in subjectName or subjectCode (case-insensitive)
 *   category  - string (optional) – filter by category
 */
router.get("/all", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search && req.query.search.trim()) {
      const searchTerm = req.query.search.trim();
      filter.$or = [
        { subjectName: { $regex: searchTerm, $options: "i" } },
        { subjectCode: { $regex: searchTerm, $options: "i" } },
      ];
    }

    if (req.query.category && req.query.category.trim()) {
      filter.Category = { $regex: req.query.category.trim(), $options: "i" };
    }

    const [subjects, total] = await Promise.all([
      Subject_db.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subject_db.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: subjects,
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
    console.error("Error fetching subjects:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/subject/
 * Create a new subject
 * Required fields: subjectName, subjectCode, Category
 */
router.post("/", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { subjectName, subjectCode, Category } = req.body;

    if (!subjectName || !subjectName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject name is required",
      });
    }
    if (!subjectCode || !subjectCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject code is required",
      });
    }
    if (!Category || !Category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const formattedSubjectName = subjectName.trim().toUpperCase();
    const formattedSubjectCode = subjectCode.trim().toUpperCase();
    const formattedCategory = Category.trim().toUpperCase();

    const existingSubject = await Subject_db.findOne({
      subjectCode: formattedSubjectCode
    });

    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message: `Subject code '${formattedSubjectCode}' already exists`,
        field: "subjectCode",
        value: formattedSubjectCode,
      });
    }

    const newSubject = new Subject_db({
      subjectName: formattedSubjectName,
      subjectCode: formattedSubjectCode,
      Category: formattedCategory,
    });

    await newSubject.save();

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: newSubject,
    });
  } catch (err) {
    console.error("Error creating subject:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      return res.status(409).json({
        success: false,
        message: `${field} '${value}' already exists`,
        field,
        value,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * PUT /api/subject/:id
 * Update a subject by ID
 * Allowed fields: subjectName, Category (subjectCode cannot be changed)
 */
router.put("/:id", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { id } = req.params;
    const { subjectName, Category } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Subject ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID format",
      });
    }

    const existingSubject = await Subject_db.findById(id);
    if (!existingSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    const updateData = {};

    if (subjectName && subjectName.trim()) {
      updateData.subjectName = subjectName.trim().toUpperCase();
    }

    if (Category && Category.trim()) {
      updateData.Category = Category.trim().toUpperCase();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update. Please provide subjectName or Category.",
      });
    }

    const updatedSubject = await Subject_db.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found after update",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: updatedSubject,
    });
  } catch (err) {
    console.error("Error updating subject:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      return res.status(409).json({
        success: false,
        message: `${field} '${value}' already exists`,
        field,
        value,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * DELETE /api/subject/:id
 * Delete a subject by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Subject ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID format",
      });
    }

    const deletedSubject = await Subject_db.findByIdAndDelete(id);

    if (!deletedSubject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
      data: deletedSubject,
    });
  } catch (err) {
    console.error("Error deleting subject:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;