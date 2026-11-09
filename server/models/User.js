import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[a-zA-Z\s.'-]+$/.test(v);
        },
        message: 'Full name can only contain alphabetic characters.'
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
          return /^\d{10}$/.test(v);
        },
        message: "Phone number must contain exactly 10 digits."
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
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        },
        message: "Password must contain uppercase, lowercase, number and special character."
      }
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
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
