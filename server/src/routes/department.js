import express from "express";
const router = express.Router();
import { connectDB } from "../config/db.js";
import Department_db from "../models/Department.model.js";

router.get("/all", async (req, res) => {
  try {
    await connectDB(); // <-- add this
    const departments = await Department_db.find();
    res.status(200).json({ success: true, data: departments, cached: false });
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    await connectDB(); // <-- add this
    const { code, name, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: "Department code and name are required" });
    }
    const existingDepartment = await Department_db.findOne({ code });
    if (existingDepartment) {
      return res.status(409).json({ success: false, message: `Department with code '${code}' already exists` });
    }
    const newDepartment = new Department_db({ code, name, description: description || "" });
    await newDepartment.save();
    res.status(201).json({ success: true, message: "Department created successfully", data: newDepartment });
  } catch (err) {
    console.error("Error creating department:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    await connectDB(); // <-- add this
    const { code } = req.params;
    const deletedDepartment = await Department_db.findOneAndDelete({ code });
    if (!deletedDepartment) {
      return res.status(404).json({ success: false, message: `Department with code '${code}' not found` });
    }
    res.status(200).json({ success: true, message: "Department deleted successfully", data: deletedDepartment });
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;