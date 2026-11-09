import mongoose from "mongoose";

const otpVerificationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["signup", "reset-password"],
      default: "signup",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60, // MongoDB TTL index: 5 minutes (300 seconds)
    },
  },
  { timestamps: false }
);

export default mongoose.model("Otp", otpVerificationSchema);
