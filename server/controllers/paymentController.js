import crypto from "crypto";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import { getRazorpayInstance, isRazorpayConfigured } from "../config/razorpay.js";
import { createBooking } from "./bookingController.js";

// @desc    Get Razorpay public Key ID
// @route   GET /api/payments/razorpay/key
// @access  Public
export const getRazorpayKey = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    return res.status(200).json({
      success: true,
      keyId,
      isConfigured: isRazorpayConfigured(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve Razorpay public key",
    });
  }
};

// @desc    Create Razorpay Order for a booking
// @route   POST /api/payments/razorpay/order
// @access  Private / Logged-in customer
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes = {} } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive amount is required to create a Razorpay order",
      });
    }

    const amountInPaise = Math.round(Number(amount) * 100);
    const orderReceipt = receipt || `rcpt_${Date.now().toString().slice(-8)}`;

    // If real Razorpay keys are configured, call Razorpay Orders API
    if (isRazorpayConfigured()) {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: orderReceipt,
        notes: {
          hotel: "Viceroy Resort",
          ...notes,
        },
      });

      return res.status(200).json({
        success: true,
        order,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } else {
      // Graceful fallback for test / simulated sandbox environment
      const simulatedOrderId = `order_sim_${Date.now()}`;
      return res.status(200).json({
        success: true,
        isSimulated: true,
        order: {
          id: simulatedOrderId,
          amount: amountInPaise,
          currency,
          receipt: orderReceipt,
          status: "created",
        },
        keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
        message: "Razorpay order initiated (Simulated Test Mode). To connect live gateway, set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

// @desc    Verify Razorpay Payment Signature and finalize reservation
// @route   POST /api/payments/razorpay/verify
// @access  Private / Logged-in customer
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id and razorpay_payment_id are required",
      });
    }

    let isSignatureValid = false;

    // Check if simulated order
    if (razorpay_order_id.startsWith("order_sim_") || !isRazorpayConfigured()) {
      isSignatureValid = true;
    } else {
      const secret = process.env.RAZORPAY_KEY_SECRET || "";
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      isSignatureValid = generatedSignature === razorpay_signature;
    }

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid Razorpay cryptographic signature",
      });
    }

    // If bookingData provided, create the reservation automatically
    if (bookingData) {
      req.body = {
        ...bookingData,
        paymentMethod: "Razorpay",
        transactionId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature || "verified_signature",
      };
      return createBooking(req, res);
    }

    return res.status(200).json({
      success: true,
      message: "Razorpay payment verified successfully",
      transactionId: razorpay_payment_id,
      orderId: razorpay_order_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify Razorpay payment",
    });
  }
};

// @desc    Get all payments (Admin only)
// @route   GET /api/payments
// @access  Admin only
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 });

    const totalRevenue = payments
      .filter((p) => p.status === "successful")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunded = payments
      .filter((p) => p.status === "refunded")
      .reduce((sum, p) => sum + (p.refundAmount || p.amount), 0);

    return res.status(200).json({
      success: true,
      count: payments.length,
      summary: {
        totalRevenue,
        totalRefunded,
        netRevenue: totalRevenue - totalRefunded,
      },
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payments",
    });
  }
};

// @desc    Get customer's own payments
// @route   GET /api/payments/my
// @access  Private
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ user: req.user._id }, { guestEmail: req.user.email }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch your payments",
    });
  }
};

// @desc    Get single payment receipt
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch payment details",
    });
  }
};
