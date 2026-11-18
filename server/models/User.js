import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z0-9\s.',\-#&]+$/.test(v);
        },
        message: 'Full name contains invalid characters.'
      }
    },
    
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      required: false,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[\d\s+\-().]{7,25}$/.test(v);
        },
        message: "Please enter a valid phone number."
      }
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: function() {
        return !this.googleId;
      },
      validate: {
        validator: function(v) {
          if (this.googleId && !v) return true;
          if (!v) return false;
          // Accept existing or newly hashed bcrypt passwords ($2a$, $2b$, $2y$, or 50+ chars)
          if (typeof v === "string" && (v.startsWith("$2a$") || v.startsWith("$2b$") || v.startsWith("$2y$") || v.length >= 50)) {
            return true;
          }
          return typeof v === "string" && v.length >= 8;
        },
        message: "Password must be at least 8 characters long."
      }
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, "Wallet balance cannot be negative"],
    },
    walletTransactions: [
      {
        type: {
          type: String,
          enum: ["credit", "debit"],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        description: {
          type: String,
          default: "",
        },
        bookingReference: {
          type: String,
          default: "",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
