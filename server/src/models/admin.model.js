import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "Admin" },
    collegeName: { type: String, default: "Noorul Islam College of Engineering and Technology" },
    collegeLogo: { type: String, default: "" },
    principalName: { type: String, default: "" },
    address: { type: String, default: "" },
    defaultWefDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
