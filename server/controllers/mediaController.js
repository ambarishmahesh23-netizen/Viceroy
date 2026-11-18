import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Media from "../models/Media.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /api/media/upload - Admin only
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    const { title, category } = req.body;
    const fileUrl = `/uploads/resort/${req.file.filename}`;

    const mediaDoc = await Media.create({
      title: title || req.file.originalname,
      originalName: req.file.originalname,
      filename: req.file.filename,
      url: fileUrl,
      category: category || "gallery",
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Media image uploaded successfully",
      media: mediaDoc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to upload media image",
      error: error.message,
    });
  }
};

// GET /api/media - Public / Admin
export const getAllMedia = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const mediaList = await Media.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: mediaList.length,
      media: mediaList,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve media library",
      error: error.message,
    });
  }
};

// DELETE /api/media/:id - Admin only
export const deleteMedia = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ success: false, message: "Media file not found" });
    }

    // Attempt to delete physical file from disk
    const filePath = path.join(__dirname, "..", "uploads", "resort", media.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn("Could not delete physical media file:", err.message);
      }
    }

    await Media.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Media file deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete media file",
      error: error.message,
    });
  }
};
