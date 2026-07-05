import express from "express";
const router = express.Router();

import Department_db from "../models/Department.model.js";



// GET all departments with caching
router.get("/all", async (req, res) => {
  try {
    

    // Fetch from database
    const departments = await Department_db.find();
    

    
    res.status(200).json({
      success: true,
      data: departments,
      cached: false
    });
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});



// POST - Create new department (clears cache)
router.post("/", async (req, res) => {
  try {
    const { code, name, description } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Department code and name are required"
      });
    }

    // Check if department already exists
    const existingDepartment = await Department_db.findOne({ code });
    if (existingDepartment) {
      return res.status(409).json({
        success: false,
        message: `Department with code '${code}' already exists`
      });
    }

    // Create new department
    const newDepartment = new Department_db({
      code,
      name,
      description: description || ""
    });

    await newDepartment.save();
    
  

   
    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: newDepartment
    });
  } catch (err) {
    console.error("Error creating department:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// DELETE - Delete department by code (clears cache)
router.delete("/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const deletedDepartment = await Department_db.findOneAndDelete({ code });

    if (!deletedDepartment) {
      return res.status(404).json({
        success: false,
        message: `Department with code '${code}' not found`
      });
    }


    res.status(200).json({
      success: true,
      message: "Department deleted successfully",
      data: deletedDepartment
    });
  } catch (err) {
    console.error(`Error deleting department with code:`, err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});




export default router;