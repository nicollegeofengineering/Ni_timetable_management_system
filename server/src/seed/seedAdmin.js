import "dotenv/config";
import { connectDB } from "../config/db.js";
import Admin from "../models/admin.model.js";
import mongoose from "mongoose";

async function seed() {
  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const existing = await Admin.findOne({ email });

  if (existing) {
    console.log("admin already exists:", email);
  } else {
    await Admin.create({ email });
    console.log("admin created:", email);
  }

  await mongoose.disconnect();
}

seed();
