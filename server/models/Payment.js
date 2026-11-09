import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    bookingReference: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    guestEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Credit/Debit Card", "UPI", "Net Banking", "Pay at Resort"],
      default: "Razorpay",
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: "",
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed", "refunded"],
      default: "successful",
    },
    cardLast4: {
      type: String,
      default: "",
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
