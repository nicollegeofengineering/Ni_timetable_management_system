import express from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
const router = express.Router();

import Hall from "../models/Hall.model.js";

/**
 * GET /api/hall/all
 * Query:
 *   page, limit, search (hallName or hallCode), minCapacity, maxCapacity
 */
router.get("/all", async (req, res) => {
  try {
    await connectDB();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = req.query.search.trim();
      filter.$or = [
        { hallName: { $regex: searchRegex, $options: "i" } },
        { hallCode: { $regex: searchRegex, $options: "i" } },
      ];
    }

    if (req.query.minCapacity) {
      const minCap = parseInt(req.query.minCapacity);
      if (!isNaN(minCap)) {
        filter.capacity = { ...filter.capacity, $gte: minCap };
      }
    }

    if (req.query.maxCapacity) {
      const maxCap = parseInt(req.query.maxCapacity);
      if (!isNaN(maxCap)) {
        filter.capacity = { ...filter.capacity, $lte: maxCap };
      }
    }

    const [halls, total] = await Promise.all([
      Hall.find(filter)
        .sort({ hallName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Hall.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: halls,
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
    console.error("Error fetching halls:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * GET /api/hall/search/:term
 * Search by hallName or hallCode (no pagination)
 */
router.get("/search/:term", async (req, res) => {
  try {
    await connectDB();

    const { term } = req.params;

    if (!term || !term.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search term is required",
      });
    }

    const searchTerm = term.trim();
    const halls = await Hall.find({
      $or: [
        { hallName: { $regex: searchTerm, $options: "i" } },
        { hallCode: { $regex: searchTerm, $options: "i" } },
      ],
    }).sort({ hallName: 1 });

    res.status(200).json({
      success: true,
      data: halls,
      count: halls.length,
    });
  } catch (err) {
    console.error("Error searching halls:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * POST /api/hall/
 * Create a new hall (requires hallName, hallCode, capacity)
 */
router.post("/", async (req, res) => {
  try {
    await connectDB();

    const { hallName, hallCode, capacity } = req.body;

    // Validate required fields
    if (!hallName || !hallName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hall name is required",
      });
    }
    if (!hallCode || !hallCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hall code is required",
      });
    }
    if (capacity === undefined || capacity === null) {
      return res.status(400).json({
        success: false,
        message: "Capacity is required",
      });
    }

    const parsedCapacity = parseInt(capacity);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive number",
      });
    }

    const formattedName = hallName.trim();
    const formattedCode = hallCode.trim().toUpperCase();

    // Check for duplicates (both hallName and hallCode must be unique)
    const existing = await Hall.findOne({
      $or: [{ hallName: formattedName }, { hallCode: formattedCode }],
    });

    if (existing) {
      const field = existing.hallName === formattedName ? "hallName" : "hallCode";
      return res.status(409).json({
        success: false,
        message: `${field} '${existing[field]}' already exists`,
        field,
        value: existing[field],
      });
    }

    const newHall = new Hall({
      hallName: formattedName,
      hallCode: formattedCode,
      capacity: parsedCapacity,
    });

    await newHall.save();

    res.status(201).json({
      success: true,
      message: "Hall created successfully",
      data: newHall,
    });
  } catch (err) {
    console.error("Error creating hall:", err);

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
 * PUT /api/hall/:id
 * Update a hall (hallName, hallCode, capacity)
 */
router.put("/:id", async (req, res) => {
  try {
    await connectDB();

    const { id } = req.params;
    const { hallName, hallCode, capacity } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hall ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hall ID format",
      });
    }

    const existingHall = await Hall.findById(id);
    if (!existingHall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found",
      });
    }

    const updateData = {};

    // Validate and prepare hallName
    if (hallName !== undefined) {
      if (!hallName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Hall name cannot be empty",
        });
      }
      const formattedName = hallName.trim();
      if (formattedName !== existingHall.hallName) {
        const conflict = await Hall.findOne({ hallName: formattedName });
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: `Hall name '${formattedName}' already exists`,
            field: "hallName",
            value: formattedName,
          });
        }
        updateData.hallName = formattedName;
      }
    }

    // Validate and prepare hallCode
    if (hallCode !== undefined) {
      if (!hallCode.trim()) {
        return res.status(400).json({
          success: false,
          message: "Hall code cannot be empty",
        });
      }
      const formattedCode = hallCode.trim().toUpperCase();
      if (formattedCode !== existingHall.hallCode) {
        const conflict = await Hall.findOne({ hallCode: formattedCode });
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: `Hall code '${formattedCode}' already exists`,
            field: "hallCode",
            value: formattedCode,
          });
        }
        updateData.hallCode = formattedCode;
      }
    }

    // Validate and prepare capacity
    if (capacity !== undefined && capacity !== null) {
      const parsedCapacity = parseInt(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive number",
        });
      }
      if (parsedCapacity !== existingHall.capacity) {
        updateData.capacity = parsedCapacity;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes to update",
      });
    }

    const updatedHall = await Hall.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Hall updated successfully",
      data: updatedHall,
    });
  } catch (err) {
    console.error("Error updating hall:", err);

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
 * DELETE /api/hall/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    await connectDB();

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hall ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hall ID format",
      });
    }

    const deletedHall = await Hall.findByIdAndDelete(id);

    if (!deletedHall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Hall deleted successfully",
      data: deletedHall,
    });
  } catch (err) {
    console.error("Error deleting hall:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;