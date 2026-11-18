import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import { createBookingService, cancelBookingService } from "../services/bookingService.js";

// Helper to look up booking by ObjectId or bookingReference
export const findBookingByIdOrRef = async (identifier) => {
  if (!identifier) return null;
  const cleanId = String(identifier).trim();
  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const b = await Booking.findById(cleanId);
    if (b) return b;
  }
  return await Booking.findOne({
    bookingReference: new RegExp(`^${cleanId}$`, "i"),
  });
};

// @desc    Create new resort booking
// @route   POST /api/bookings
export const createBooking = async (req, res) => {
  try {
    if (req.user?.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Administrators cannot make bookings.",
      });
    }

    const { booking, walletBalance } = await createBookingService(req.body, req.user);

    return res.status(201).json({
      success: true,
      message: "Reservation confirmed successfully",
      booking,
      walletBalance,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create reservation",
    });
  }
};

// @desc    Get booking by ID or reference
// @route   GET /api/bookings/:id
export const getBookingById = async (req, res) => {
  try {
    const booking = await findBookingByIdOrRef(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking reservation not found" });
    }

    return res.status(200).json({ success: true, booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bookings of current user
// @route   GET /api/bookings/my
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ user: req.user._id }, { guestEmail: req.user.email }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all bookings (Admin)
// @route   GET /api/bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check-In Guest
// @route   PUT /api/bookings/:id/check-in
export const checkInGuest = async (req, res) => {
  try {
    const booking = await findBookingByIdOrRef(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = "checked-in";
    booking.checkedInAt = new Date();
    await booking.save();

    if (booking.room) await Room.findByIdAndUpdate(booking.room, { status: "booked" });

    return res.status(200).json({ success: true, message: "Guest checked in successfully", booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check-Out Guest
// @route   PUT /api/bookings/:id/check-out
export const checkOutGuest = async (req, res) => {
  try {
    const booking = await findBookingByIdOrRef(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = "checked-out";
    booking.checkedOutAt = new Date();
    await booking.save();

    if (booking.room) await Room.findByIdAndUpdate(booking.room, { status: "available" });

    return res.status(200).json({ success: true, message: "Guest checked out successfully", booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel Reservation
// @route   PUT /api/bookings/:id/cancel
export const cancelBooking = async (req, res) => {
  try {
    const { cancellationReason } = req.body || {};
    const { booking, walletRefunded, newWalletBalance } = await cancelBookingService(
      req.params.id,
      req.user,
      cancellationReason
    );

    return res.status(200).json({
      success: true,
      message: walletRefunded 
        ? `Cancelled successfully. Refund credited to wallet.` 
        : `Reservation cancelled successfully.`,
      booking,
      walletRefunded,
      walletBalance: newWalletBalance,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};