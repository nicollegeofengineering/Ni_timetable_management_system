import express from "express";
import mongoose from "mongoose";
const router = express.Router();

import Hall_db from "../models/Hall.model.js";

// In-memory cache
let hall_cache = null;

// Helper function to clear cache
const clearCache = () => {
  hall_cache = null;
  console.log("Hall cache cleared");
};

/**
 * GET /api/hall/all
 * Query params:
 *   page      - number (default 1)
 *   limit     - number (default 10)
 *   search    - string (optional) – search in hallName (case-insensitive)
 *   minCapacity - number (optional) – filter by minimum capacity
 *   maxCapacity - number (optional) – filter by maximum capacity
 */
router.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // Search by hallName (case-insensitive, partial match)
    if (req.query.search && req.query.search.trim()) {
      filter.hallName = { $regex: req.query.search.trim(), $options: "i" };
    }

    // Filter by minimum capacity
    if (req.query.minCapacity) {
      const minCap = parseInt(req.query.minCapacity);
      if (!isNaN(minCap)) {
        filter.capacity = { ...filter.capacity, $gte: minCap };
      }
    }

    // Filter by maximum capacity
    if (req.query.maxCapacity) {
      const maxCap = parseInt(req.query.maxCapacity);
      if (!isNaN(maxCap)) {
        filter.capacity = { ...filter.capacity, $lte: maxCap };
      }
    }

    // Execute queries in parallel
    const [halls, total] = await Promise.all([
      Hall_db.find(filter)
        .sort({ hallName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Hall_db.countDocuments(filter),
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
 * Search halls by name (returns all matches, no pagination)
 */
router.get("/search/:term", async (req, res) => {
  try {
    const { term } = req.params;

    if (!term || !term.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search term is required",
      });
    }

    const searchTerm = term.trim();
    const halls = await Hall_db.find({
      hallName: { $regex: searchTerm, $options: "i" }
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
 * Create a new hall
 * Required fields: hallName, capacity
 */
router.post("/", async (req, res) => {
  try {
    const { hallName, capacity } = req.body;

    // Validate required fields
    if (!hallName || !hallName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Hall name is required",
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

    // Format values
    const formattedHallName = hallName.trim();

    // Check if hall name already exists
    const existingHall = await Hall_db.findOne({ 
      hallName: formattedHallName 
    });
    
    if (existingHall) {
      return res.status(409).json({
        success: false,
        message: `Hall '${formattedHallName}' already exists`,
        field: "hallName",
        value: formattedHallName,
      });
    }

    const newHall = new Hall_db({
      hallName: formattedHallName,
      capacity: parsedCapacity,
    });

    await newHall.save();
    
    // Clear cache after adding new hall
    clearCache();

    res.status(201).json({
      success: true,
      message: "Hall created successfully",
      data: newHall,
    });
  } catch (err) {
    console.error("Error creating hall:", err);
    
    // Handle mongoose duplicate key error
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
 * Update a hall by ID
 * Allowed fields: hallName, capacity
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { hallName, capacity } = req.body;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hall ID is required",
      });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hall ID format",
      });
    }

    // Find existing hall
    const existingHall = await Hall_db.findById(id);
    if (!existingHall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found",
      });
    }

    // Build update object
    const updateData = {};

    if (hallName && hallName.trim()) {
      const formattedHallName = hallName.trim();
      
      // Check if new hall name already exists (if different from current)
      if (formattedHallName !== existingHall.hallName) {
        const hallExists = await Hall_db.findOne({ 
          hallName: formattedHallName 
        });
        
        if (hallExists) {
          return res.status(409).json({
            success: false,
            message: `Hall '${formattedHallName}' already exists`,
            field: "hallName",
            value: formattedHallName,
          });
        }
        updateData.hallName = formattedHallName;
      }
    }

    if (capacity !== undefined && capacity !== null) {
      const parsedCapacity = parseInt(capacity);
      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Capacity must be a positive number",
        });
      }
      updateData.capacity = parsedCapacity;
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update. Please provide hallName or capacity.",
      });
    }

    const updatedHall = await Hall_db.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedHall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found after update",
      });
    }

    // Clear cache after updating hall
    clearCache();

    res.status(200).json({
      success: true,
      message: "Hall updated successfully",
      data: updatedHall,
    });
  } catch (err) {
    console.error("Error updating hall:", err);

    // Handle mongoose duplicate key error
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
 * Delete a hall by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Hall ID is required",
      });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hall ID format",
      });
    }

    const deletedHall = await Hall_db.findByIdAndDelete(id);

    if (!deletedHall) {
      return res.status(404).json({
        success: false,
        message: "Hall not found",
      });
    }

    // Clear cache after deleting hall
    clearCache();

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