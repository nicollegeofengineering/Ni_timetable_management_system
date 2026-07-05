import mongoose from "mongoose";

const hallSchema = new mongoose.Schema(
  {
    hallName: {
      type: String,
      required: true,
      unique: true,
    },

    capacity: {
      type: Number,
      required: true,
    },

   
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Hall", hallSchema);