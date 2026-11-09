import bcrypt from "bcrypt";
import User from "../models/User.js";
import {
  checkUserExistsService,
  loginService,
  registerService,
  sendSignupOtpService,
  verifySignupOtpService,
  sendForgotPasswordOtpService,
  resetPasswordWithOtpService,
} from "../services/authService.js";
import { googleLoginService } from "../services/authService.js";

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    const result = await googleLoginService(credential);

    // Store JWT in an HTTP-only cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Google login failed",
    });
  }
};

export const checkEmailAvailability = async (req, res) => {
  try {
    const email = req.body?.email || req.query?.email;
    const result = await checkUserExistsService(email);

    return res.status(200).json({
      success: true,
      exists: result.exists,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to check email",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginService(email, password);

    // Store the JWT in a cookie
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to log out",
    });
  }
};

export const registerUser = async (req, res) => {
  return res.status(403).json({
    success: false,
    message:
      "Direct registration without email OTP is disabled. Please create an account using email OTP verification at /signup.",
  });
};

export const sendSignupOtp = async (req, res) => {
  try {
    const { fullName, email, password } = req.body ?? {};

    const result = await sendSignupOtpService({
      fullName,
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      email: result.email,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      isRegistered: error.isRegistered || false,
      message: error.message || "Failed to send signup OTP",
    });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body ?? {};

    const result = await verifySignupOtpService({
      email,
      otp,
    });

    // Set auth cookie for instant login
    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "Account verified and logged in successfully",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      isRegistered: error.isRegistered || false,
      message: error.message || "Verification failed",
    });
  }
};

export const sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body ?? {};
    const result = await sendForgotPasswordOtpService(email);

    return res.status(200).json({
      success: true,
      message: result.message,
      email: result.email,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to send password reset code",
    });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body ?? {};
    const result = await resetPasswordWithOtpService({
      email,
      otp,
      newPassword,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to reset password",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone || "",
        address: req.user.address || "",
        role: req.user.role,
        profilePhoto: req.user.profilePhoto || "",
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, address, profilePhoto } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (address !== undefined) {
      user.address = address.trim();
    }

    if (profilePhoto !== undefined) {
      user.profilePhoto = profilePhoto;
    }

    if (email && email.trim().toLowerCase() !== user.email) {
      const emailExists = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: user._id },
      });
      if (emailExists) {
        return res.status(400).json({ success: false, message: "Email is already taken" });
      }
      user.email = email.trim().toLowerCase();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role,
        profilePhoto: user.profilePhoto || "",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update password",
    });
  }
};

export const seedAdminUser = async (req, res) => {
  try {
    const adminEmail = "admin@viceroyresort.com";
    let admin = await User.findOne({ email: adminEmail });

    const hashedPassword = await bcrypt.hash("admin123", 10);

    if (!admin) {
      admin = await User.create({
        fullName: "Viceroy Administrator",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
    } else {
      admin.role = "admin";
      admin.password = hashedPassword;
      await admin.save();
    }

    return res.status(200).json({
      success: true,
      message: "Admin account verified/ready",
      credentials: {
        email: adminEmail,
        password: "admin123",
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to setup admin account",
    });
  }
};


export const makeMeAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user.role = "admin";
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Role updated to admin in MongoDB successfully",
      user: {
        _id: user._id, 
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        address: user.address || "",
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to elevate role",
    });
  }
};
