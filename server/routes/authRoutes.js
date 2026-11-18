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
  uploadProfilePhoto,
  deleteProfilePhoto,
} from "../controllers/authController.js";
import { protect, protectOrSecretKey } from "../middleware/authMIddleware.js";
import { uploadAvatar } from "../middleware/uploadMiddleware.js";

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
router.post("/profile-photo", protect, uploadAvatar.single("photo"), uploadProfilePhoto);
router.delete("/profile-photo", protect, deleteProfilePhoto);
router.put("/update-password", protect, updatePassword);

// Elevate user role to admin (supports admin token OR secretKey)
router.post("/make-admin", protectOrSecretKey, makeMeAdmin);

// Ensure admin user exists (useful for initialization/testing)
router.post("/seed-admin", seedAdminUser);

export default router;
