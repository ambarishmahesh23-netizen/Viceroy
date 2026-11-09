import Review from "../models/Review.js";
import Booking from "../models/Booking.js";

// @desc    Get all published reviews (Public for Home and Room pages)
// @route   GET /api/reviews
// @access  Public
export const getPublishedReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: "published" }).sort({ createdAt: -1 });

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
    const { bookingId, suiteName, rating, title, comment } = req.body;

    if (!rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        message: "Rating, title, and comment are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5 stars",
      });
    }

    let isVerified = false;
    let actualSuiteName = suiteName || "Resort Stay";

    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (booking) {
        isVerified = true;
        actualSuiteName = booking.roomName;
      }
    }

    const review = await Review.create({
      user: req.user._id,
      booking: bookingId || null,
      userName: req.user.fullName,
      userEmail: req.user.email,
      suiteName: actualSuiteName,
      rating: Number(rating),
      title: title.trim(),
      comment: comment.trim(),
      isVerifiedStay: isVerified,
      status: "published",
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

// @desc    Moderate Review Status (published, hidden)
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
      review.status = status;
    } else {
      review.status = review.status === "published" ? "hidden" : "published";
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
