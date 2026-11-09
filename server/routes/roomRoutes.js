import express from "express";
import {
  getRooms,
  getRoomStats,
  getRoomById,
  checkRoomAvailability,
  createRoom,
  updateRoom,
  toggleRoomStatus,
  deleteRoom,
} from "../controllers/roomController.js";
import { protect, adminOnly } from "../middleware/authMIddleware.js";

const router = express.Router();

// Public routes (anyone can see rooms and available counts)
router.get("/stats", getRoomStats);
router.get("/check-availability", checkRoomAvailability);
router.get("/", getRooms);
router.get("/:id", getRoomById);

// Admin-protected routes
router.post("/", protect, adminOnly, createRoom);
router.put("/:id", protect, adminOnly, updateRoom);
router.patch("/:id/status", protect, adminOnly, toggleRoomStatus);
router.delete("/:id", protect, adminOnly, deleteRoom);

export default router;
