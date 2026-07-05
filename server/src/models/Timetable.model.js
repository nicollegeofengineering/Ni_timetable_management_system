import mongoose from "mongoose";

const timetableSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    semester: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 7, // 1=Monday ... 7=Sunday
    },
    period: {
      type: Number,
      required: true,
      min: 1,
      max: 7, // P1..P7
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: false,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: false,
    },
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hall",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast cell retrieval
timetableSchema.index(
  { academicYear: 1, department: 1, year: 1, semester: 1, day: 1, period: 1 },
  { unique: false }
);

// Indexes for conflict checks
timetableSchema.index({ staff: 1, day: 1, period: 1 });
timetableSchema.index({ hall: 1, day: 1, period: 1 });
timetableSchema.index({ department: 1, year: 1, day: 1, period: 1 });

export default mongoose.model("Timetable", timetableSchema);