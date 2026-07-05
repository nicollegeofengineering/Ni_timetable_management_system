import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
    },

    subjectCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    Category: {
      type: String,
      required: true,
      uppercase: true,
    },

  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Subject", subjectSchema);