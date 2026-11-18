import crypto from "crypto";
import User from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { getRazorpayInstance, isRazorpayConfigured } from "../config/razorpay.js";

// POST /api/wallet/topup/order - Authenticated user
export const createWalletTopupOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum wallet top-up amount is ₹100",
      });
    }

    if (numAmount > 1000000) {
      return res.status(400).json({
        success: false,
        message: "Maximum wallet top-up amount is ₹10,00,000",
      });
    }

    const amountInPaise = Math.round(numAmount * 100);
    const receipt = `wt_${Date.now().toString().slice(-8)}`;

    if (isRazorpayConfigured()) {
      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
          type: "wallet_topup",
          userId: req.user._id.toString(),
          email: req.user.email,
        },
      });

      return res.status(200).json({
        success: true,
        orderId: order.id,
        amount: numAmount,
        currency: order.currency || "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    // In local development / test mode when real keys are not set
    if (process.env.NODE_ENV !== "production") {
      const mockOrderId = `order_sim_wt_${Date.now()}`;
      return res.status(200).json({
        success: true,
        orderId: mockOrderId,
        amount: numAmount,
        currency: "INR",
        keyId: "rzp_test_placeholder",
        isSimulation: true,
      });
    }

    return res.status(503).json({
      success: false,
      message: "Razorpay payment gateway is not configured for production top-up.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to initiate wallet top-up order",
      error: error.message,
    });
  }
};

// POST /api/wallet/topup/verify - Authenticated user
export const verifyWalletTopupPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const userId = req.user._id;
    const numAmount = Number(amount);

    if (!razorpay_order_id || !razorpay_payment_id || !numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification details or invalid amount",
      });
    }

    // Check for replay attacks: ensure payment ID hasn't been credited already
    const existingTxn = await WalletTransaction.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (existingTxn) {
      return res.status(400).json({
        success: false,
        message: "This payment has already been credited to a wallet.",
      });
    }

    if (isRazorpayConfigured()) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature. Transaction verification failed.",
        });
      }
    } else if (process.env.NODE_ENV === "production") {
      return res.status(400).json({
        success: false,
        message: "Production verification failed: gateway secret unconfigured.",
      });
    }

    // Atomically fetch balance and credit
    const userBefore = await User.findById(userId);
    if (!userBefore) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const balanceBefore = userBefore.walletBalance || 0;
    const balanceAfter = balanceBefore + numAmount;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { walletBalance: numAmount },
        $push: {
          walletTransactions: {
            type: "credit",
            amount: numAmount,
            description: `Wallet top-up (${razorpay_payment_id})`,
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    const transaction = await WalletTransaction.create({
      userId,
      amount: numAmount,
      type: "credit",
      category: "topup",
      description: `Wallet top-up via Razorpay (${razorpay_payment_id})`,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "success",
      balanceBefore,
      balanceAfter,
    });

    return res.status(200).json({
      success: true,
      message: `₹${numAmount.toLocaleString("en-IN")} credited to your wallet successfully.`,
      walletBalance: updatedUser.walletBalance,
      transaction,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify wallet top-up",
      error: error.message,
    });
  }
};

// GET /api/wallet/transactions - Authenticated user
export const getMyWalletTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 });

    const user = await User.findById(req.user._id).select("walletBalance");

    return res.status(200).json({
      success: true,
      walletBalance: user ? user.walletBalance : 0,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet transactions",
      error: error.message,
    });
  }
};

// GET /api/wallet/admin/transactions - Admin only
export const getAdminWalletTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find()
      .populate("userId", "fullName email phone role")
      .sort({ createdAt: -1 });

    const totalDeposited = transactions
      .filter((t) => t.type === "credit" && t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpent = transactions
      .filter((t) => t.type === "debit" && t.status === "success")
      .reduce((sum, t) => sum + t.amount, 0);

    return res.status(200).json({
      success: true,
      count: transactions.length,
      summary: {
        totalDeposited,
        totalSpent,
        netCirculation: totalDeposited - totalSpent,
      },
      transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all wallet transactions",
      error: error.message,
    });
  }
};

// POST /api/wallet/admin/adjust - Admin only
export const adminAdjustWalletBalance = async (req, res) => {
  try {
    const { userId, amount, type, description } = req.body;
    const numAmount = Number(amount);

    if (!userId || !numAmount || numAmount <= 0 || !["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId, positive amount, and type ('credit' or 'debit') are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const balanceBefore = user.walletBalance || 0;
    if (type === "debit" && balanceBefore < numAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient user wallet balance (Available: ₹${balanceBefore})`,
      });
    }

    const balanceAfter = type === "credit" ? balanceBefore + numAmount : balanceBefore - numAmount;
    const increment = type === "credit" ? numAmount : -numAmount;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { walletBalance: increment },
        $push: {
          walletTransactions: {
            type,
            amount: numAmount,
            description: description || `Admin adjustment: ${type}`,
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    const txn = await WalletTransaction.create({
      userId,
      amount: numAmount,
      type,
      category: "admin_adjustment",
      description: description || `Admin manual ${type}`,
      status: "success",
      balanceBefore,
      balanceAfter,
    });

    return res.status(200).json({
      success: true,
      message: `Wallet ${type}ed successfully. New balance: ₹${updatedUser.walletBalance.toLocaleString("en-IN")}`,
      walletBalance: updatedUser.walletBalance,
      transaction: txn,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to adjust wallet balance",
      error: error.message,
    });
  }
};
