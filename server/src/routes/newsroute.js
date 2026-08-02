import express from "express";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import News from "../models/News.model.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * GET /api/news
 * Returns all news (for the college website) – published only, sorted newest first
 */
router.get("/", async (req, res) => {
  try {
    await connectDB();
    const news = await News.find({ status: "published" })
      .sort({ date: -1 })
      .lean();
    res.status(200).json(news); // plain array (as PHP expects)
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/news/admin
 * Admin view – returns all news with pagination & search
 * Query: page, limit, search
 */
router.get("/admin", requireAuth, async (req, res) => {
  try {
    await connectDB();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = {};

    if (req.query.search && req.query.search.trim()) {
      filter.$or = [
        { title: { $regex: req.query.search.trim(), $options: "i" } },
        { content: { $regex: req.query.search.trim(), $options: "i" } },
      ];
    }

    const [news, total] = await Promise.all([
      News.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      News.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: news,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching admin news:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/news/:id
 * Get a single news item by ID
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const news = await News.findById(id);
    if (!news) {
      return res.status(404).json({ success: false, message: "News not found" });
    }
    res.status(200).json({ success: true, data: news });
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/news
 * Create a new news item
 * Body: { title, content?, author?, status?, date? }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { title, content, author, status, date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const newNews = new News({
      title: title.trim(),
      content: content ? content.trim() : "",
      author: author ? author.trim() : "Admin",
      status: status || "published",
      date: date || new Date(),
    });

    await newNews.save();
    res.status(201).json({ success: true, message: "News created", data: newNews });
  } catch (err) {
    console.error("Error creating news:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/news/:id
 * Update a news item
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    const { title, content, author, status, date } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const existing = await News.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "News not found" });
    }

    const updateData = {};
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ success: false, message: "Title cannot be empty" });
      }
      updateData.title = title.trim();
    }
    if (content !== undefined) updateData.content = content.trim();
    if (author !== undefined) updateData.author = author.trim();
    if (status !== undefined) updateData.status = status;
    if (date !== undefined) updateData.date = date;

    const updated = await News.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: "News updated", data: updated });
  } catch (err) {
    console.error("Error updating news:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/news/:id
 * Delete a news item
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const deleted = await News.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "News not found" });
    }
    res.status(200).json({ success: true, message: "News deleted", data: deleted });
  } catch (err) {
    console.error("Error deleting news:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;