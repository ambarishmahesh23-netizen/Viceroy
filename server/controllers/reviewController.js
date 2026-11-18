import mongoose from "mongoose";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

// @desc    Get all published reviews (Public for Home and Room pages)
// @route   GET /api/reviews
// @access  Public
export const getPublishedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      status: { $in: ["published", "approved"] },
    }).sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 5.0;

    return res.status(200).json({
      success: true,
      count: totalReviews,
      averageRating,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
};

// @desc    Submit a review (Module 8)
// @route   POST /api/reviews
// @access  Private (Logged-in Customer)
export const createReview = async (req, res) => {
  try {
    const {
      bookingId,
      roomId,
      suiteName,
      rating,
      title,
      comment,
      stayDate,
      status,
    } = req.body;

    if (!rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating, title, and comment are required",
      });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars",
      });
    }

    let isVerified = false;
    let actualSuiteName = suiteName || "Resort Stay";
    let matchedBookingObjId = null;
    let matchedRoomObjId = null;

    if (bookingId) {
      const cleanBookingId = String(bookingId).trim();
      let b = null;
      if (mongoose.Types.ObjectId.isValid(cleanBookingId)) {
        b = await Booking.findById(cleanBookingId);
      }
      if (!b) {
        b = await Booking.findOne({
          bookingReference: new RegExp(`^${cleanBookingId}$`, "i"),
        });
      }
      if (b) {
        isVerified = true;
        actualSuiteName = b.roomName;
        matchedBookingObjId = b._id;
      }
    }

    if (roomId) {
      const cleanRoomId = String(roomId).trim();
      if (mongoose.Types.ObjectId.isValid(cleanRoomId)) {
        const r = await Room.findById(cleanRoomId);
        if (r) {
          matchedRoomObjId = r._id;
          if (!actualSuiteName || actualSuiteName === "Resort Stay") {
            actualSuiteName = r.name;
          }
        }
      }
    }

    const review = await Review.create({
      user: req.user?._id || null,
      booking: matchedBookingObjId,
      bookingId: bookingId ? String(bookingId) : "",
      room: matchedRoomObjId,
      roomId: roomId ? String(roomId) : "",
      userName: req.user?.fullName || "Alexander Vance",
      userEmail: req.user?.email || "alexander.vance@example.com",
      suiteName: actualSuiteName,
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      stayDate: stayDate?.trim() || "",
      isVerifiedStay: isVerified,
      status: (status || "approved").toLowerCase(),
    });

    return res.status(201).json({
      success: true,
      message: "Thank you! Your review has been submitted successfully.",
      review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit review",
    });
  }
};

// @desc    Get all reviews for Admin Moderation
// @route   GET /api/reviews/admin
// @access  Admin only
export const getAdminReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews for moderation",
    });
  }
};

// @desc    Moderate Review Status (published, approved, pending, hidden, rejected)
// @route   PATCH /api/reviews/:id/status
// @access  Admin only
export const moderateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      const validStatuses = ["published", "approved", "pending", "hidden", "rejected"];
      if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid review status. Allowed: ${validStatuses.join(", ")}`,
        });
      }
      review.status = normalizedStatus;
    } else {
      review.status = review.status === "approved" || review.status === "published" ? "hidden" : "approved";
    }

    await review.save();

    return res.status(200).json({
      success: true,
      message: `Review status updated to ${review.status}`,
      review,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update review status",
    });
  }
};

// @desc    Delete Review
// @route   DELETE /api/reviews/:id
// @access  Admin only
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
};
