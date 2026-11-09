import express from "express";
import {
  getAllPayments,
  getMyPayments,
  getPaymentById,
  getRazorpayKey,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/paymentController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

// Razorpay Payment Gateway Routes
router.get("/razorpay/key", getRazorpayKey);
router.post("/razorpay/order", protect, createRazorpayOrder);
router.post("/razorpay/verify", protect, verifyRazorpayPayment);

// Customer & Admin Payment Records
router.get("/my", protect, getMyPayments);
router.get("/:id", protect, getPaymentById);
router.get("/", protect, adminOnly, getAllPayments);

export default router;
