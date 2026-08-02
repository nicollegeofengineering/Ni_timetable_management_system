import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    author: {
      type: String,
      trim: true,
      default: "Admin",
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster sorting on date
newsSchema.index({ date: -1 });

export default mongoose.model("News", newsSchema);