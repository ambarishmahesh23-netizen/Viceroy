import express from "express";

import {
  checkEmailAvailability,
  loginUser,
  logoutUser,
  registerUser,
  sendSignupOtp,
  verifySignupOtp,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
  getCurrentUser,
  getWalletDetails,
  seedAdminUser,
  updateProfile,
  updatePassword,
  makeMeAdmin,
  googleLogin,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMIddleware.js";

const router = express.Router();

// Google OAuth Login and Signup
router.post("/google", googleLogin);

// Check if user/email is already registered
router.post("/check-email", checkEmailAvailability);
router.get("/check-email", checkEmailAvailability);

// Login and Logout
router.post("/login", loginUser);
router.post("/logout", logoutUser);

// Direct registration route
router.post("/register", registerUser);

// OTP-based signup routes
router.post("/signup/send-otp", sendSignupOtp);
router.post("/signup/verify-otp", verifySignupOtp);

// Forgot Password routes
router.post("/forgot-password/send-otp", sendForgotPasswordOtp);
router.post("/forgot-password/reset", resetPasswordWithOtp);

// User profile & settings (protected)
router.get("/me", protect, getCurrentUser);
router.get("/wallet", protect, getWalletDetails);
router.put("/profile", protect, updateProfile);
router.put("/update-password", protect, updatePassword);

// Elevate current user role to admin (useful for instant testing and sync)
router.post("/make-admin", protect, makeMeAdmin);

// Ensure admin user exists (useful for initialization/testing)
router.post("/seed-admin", seedAdminUser);

export default router;
