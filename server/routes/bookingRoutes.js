import express from "express";
import {
  createBooking,
  getBookingById,
  getMyBookings,
  getAllBookings,
  checkInGuest,
  checkOutGuest,
  cancelBooking,
} from "../controllers/bookingController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

// Customer & General Booking Operations (Requires Login)
router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/:id", protect, getBookingById);
router.put("/:id/cancel", protect, cancelBooking);

// Admin-only Booking Management (Check-in, Check-out, View all)
router.get("/", protect, adminOnly, getAllBookings);
router.put("/:id/check-in", protect, adminOnly, checkInGuest);
router.put("/:id/check-out", protect, adminOnly, checkOutGuest);

export default router;
