import express from "express";
import {
  getPublishedReviews,
  createReview,
  getAdminReviews,
  moderateReviewStatus,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

// Public routes
router.get("/", getPublishedReviews);

// Logged-in customer review submission
router.post("/", protect, createReview);

// Admin-only review moderation
router.get("/admin", protect, adminOnly, getAdminReviews);
router.patch("/:id/status", protect, adminOnly, moderateReviewStatus);
router.delete("/:id", protect, adminOnly, deleteReview);

export default router;
