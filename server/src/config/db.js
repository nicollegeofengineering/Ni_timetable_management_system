import mongoose from "mongoose";

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    mongoose.set("bufferCommands", false);
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, { dbName: "NICETECH_TEST" })
      .then((m) => {
        console.log("Connected to MongoDB – database: NICETECH_TEST");
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error("MongoDB connection failed:", err.message);
    throw err;
  }

  return cached.conn;
}