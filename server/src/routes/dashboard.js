import express from "express";
import { connectDB } from "../config/db.js"; // <-- added import

import Department from "../models/Department.model.js";
import Staff from "../models/Staff.model.js";
import Subject from "../models/Subjects.model.js";
import Hall from "../models/Hall.model.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  try {
    await connectDB(); // <-- added

    const [departments, staff, subjects, halls] = await Promise.all([
      Department.countDocuments(),
      Staff.countDocuments(),
      Subject.countDocuments(),
      Hall.countDocuments(),
    ]);

    res.json({
      departments,
      staff,
      subjects,
      halls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch dashboard statistics.",
    });
  }
});

export default router;