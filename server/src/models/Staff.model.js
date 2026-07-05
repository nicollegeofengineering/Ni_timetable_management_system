import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    staffName: {
      type: String,
      required: true,
      trim: true,
    },

    staffCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    staffId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    facultyId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Staff", staffSchema);