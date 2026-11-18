import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Also support Authorization header
    if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access this resource",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied. Admin privileges required.",
  });
};

const protectOrSecretKey = async (req, res, next) => {
  const secretKey = req.body?.secretKey || req.headers?.["x-secret-key"];
  // If an environment secret is configured, allow it for server-to-server operations
  if (process.env.SUPER_ADMIN_SECRET && secretKey && secretKey === process.env.SUPER_ADMIN_SECRET) {
    return next();
  }
  return protect(req, res, next);
};

export { protect, adminOnly, protectOrSecretKey };
