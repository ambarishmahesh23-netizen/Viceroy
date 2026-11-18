import express from "express";
import {
  createWalletTopupOrder,
  verifyWalletTopupPayment,
  getMyWalletTransactions,
  getAdminWalletTransactions,
  adminAdjustWalletBalance,
} from "../controllers/walletController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

// User Wallet Routes
router.post("/topup/order", protect, createWalletTopupOrder);
router.post("/topup/verify", protect, verifyWalletTopupPayment);
router.get("/transactions", protect, getMyWalletTransactions);

// Admin Wallet Monitoring & Management
router.get("/admin/transactions", protect, adminOnly, getAdminWalletTransactions);
router.post("/admin/adjust", protect, adminOnly, adminAdjustWalletBalance);

export default router;
