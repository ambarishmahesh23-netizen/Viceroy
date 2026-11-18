import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    bookingId: {
      type: String,
      trim: true,
      default: "",
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false,
    },
    roomId: {
      type: String,
      trim: true,
      default: "",
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
    stayDate: {
      type: String,
      trim: true,
      default: "",
    },
    isVerifiedStay: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["published", "approved", "pending", "hidden", "rejected"],
      default: "approved",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;
