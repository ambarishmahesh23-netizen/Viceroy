import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    suiteName: {
      type: String,
      default: "Resort Stay",
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: [true, "Review title is required"],
      trim: true,
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
    },
    isVerifiedStay: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["published", "pending", "hidden"],
      default: "published",
    },
  },
  { timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;
