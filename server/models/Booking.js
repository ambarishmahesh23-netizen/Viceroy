import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false,
    },
    roomName: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    roomCategory: {
      type: String,
      trim: true,
      default: "Deluxe Room",
    },
    roomNumber: {
      type: String,
      trim: true,
      default: "",
    },
    roomImage: {
      type: String,
      default: "/images/home1.png",
    },
    guestName: {
      type: String,
      required: [true, "Guest name is required"],
      trim: true,
    },
    guestEmail: {
      type: String,
      required: [true, "Guest email is required"],
      trim: true,
      lowercase: true,
    },
    guestPhone: {
      type: String,
      trim: true,
      default: "",
    },
    checkIn: {
      type: Date,
      required: [true, "Check-in date is required"],
    },
    checkOut: {
      type: Date,
      required: [true, "Check-out date is required"],
    },
    nights: {
      type: Number,
      required: true,
      min: [1, "Stay must be at least 1 night"],
      default: 1,
    },
    roomsCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    allocatedRoomNumbers: {
      type: [String],
      default: [],
    },
    suites: [
      {
        room: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Room",
          required: false,
        },
        roomName: { type: String, trim: true },
        roomCategory: { type: String, trim: true },
        roomNumber: { type: String, trim: true },
        roomsCount: { type: Number, default: 1 },
        pricePerNight: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
        allocatedRoomNumbers: { type: [String], default: [] },
      },
    ],
    guests: {
      type: Number,
      default: 1,
      min: [1, "Guests must be at least 1"],
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "refunded"],
      default: "paid",
    },
    paymentMethod: {
      type: String,
      default: "Razorpay",
    },
    refundedToWallet: {
      type: Boolean,
      default: false,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    transactionId: {
      type: String,
      default: "",
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
    status: {
      type: String,
      enum: ["confirmed", "checked-in", "checked-out", "cancelled"],
      default: "confirmed",
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedOutAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
