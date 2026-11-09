import express from "express";
import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  replyEnquiry,
  deleteEnquiry,
} from "../controllers/enquiryController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

// Public route for customers to submit inquiries
router.post("/", createEnquiry);

// Admin-only routes
router.get("/", protect, adminOnly, getEnquiries);
router.get("/:id", protect, adminOnly, getEnquiryById);
router.post("/:id/reply", protect, adminOnly, replyEnquiry);
router.delete("/:id", protect, adminOnly, deleteEnquiry);

export default router;
