import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OtpVerification from "../models/OtpVerification.js";
import generateOTP from "../utils/generateOtp.js";
import sendEmail from "../utils/sendEmail.js";
import { OAuth2Client } from "google-auth-library";

export const checkUserExistsService = async (email) => {
  if (!email || !email.trim()) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  return {
    exists: !!existingUser,
    message: existingUser
      ? "This email is already registered."
      : "Email is available.",
  };
};

export const loginService = async (email, password) => {
  // 1. Validate input
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  // 2. Find user in MongoDB
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Check whether the user has a password
if (!user.password) {
  const error = new Error("Invalid email or password");
  error.statusCode = 401;
  throw error;
}

  // 3. Compare entered password with hashed password
  const isPasswordValid = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 4. Generate JWT
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // 5. Return user details and token
  return {
    token,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto || "",
    },
  };
};

export const registerService = async ({
  fullName,
  email,
  password,
}) => {
  // 1. Validate required fields
  if (!fullName?.trim() || !email?.trim() || !password) {
    const error = new Error("All fields are required");
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate password length
  if (password.length < 8) {
    const error = new Error(
      "Password must contain at least 8 characters"
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Normalize and validate email format
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error("Please enter a valid email address");
    error.statusCode = 400;
    throw error;
  }

  // 4. Condition check: Check whether the user is already registered
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    const error = new Error(
      "This email is already registered. Please sign in to your account."
    );
    error.statusCode = 409;
    error.isRegistered = true;
    throw error;
  }

  // 5. Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 6. Save user in MongoDB
  let user;
  try {
    user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "customer",
    });
  } catch (dbError) {
    if (dbError.code === 11000) {
      const error = new Error(
        "This email is already registered. Please sign in."
      );
      error.statusCode = 409;
      error.isRegistered = true;
      throw error;
    }
    throw dbError;
  }

  // 7. Generate JWT for auto-login
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // 8. Return safe user details and token
  return {
    token,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto || "",
    },
  };
};

export const sendSignupOtpService = async ({
  fullName,
  email,
  password,
}) => {
  if (!fullName?.trim() || !email?.trim() || !password) {
    const error = new Error("All fields are required");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error(
      "Password must contain at least 8 characters"
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error("Please enter a valid email address");
    error.statusCode = 400;
    throw error;
  }

  // Condition check: Check whether the user is already registered
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    const error = new Error(
      "This email is already registered. Please sign in to your account."
    );
    error.statusCode = 409;
    error.isRegistered = true;
    throw error;
  }

  // Generate a six-digit numeric OTP
  const otp = generateOTP();

  // Hash the password before storing in pending collection
  const hashedPassword = await bcrypt.hash(password, 12);

  // Remove any previous pending signup OTP for this email
  await OtpVerification.deleteMany({
    email: normalizedEmail,
  });

  // Save OTP temporarily in MongoDB (expires in 5 mins)
  await OtpVerification.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    otp,
    purpose: "signup",
  });

  // Send the actual real email
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Viceroy Resort - Sign Up Verification Code",
      text: `Your Viceroy Resort verification code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e0dfd5; border-radius: 8px; background: #fdfcf9;">
          <h2 style="color: #354638; letter-spacing: 3px; font-weight: 500; text-align: center; margin-bottom: 24px;">VICEROY RESORT</h2>
          <p style="color: #292d27; font-size: 15px; line-height: 1.6;">Dear Guest,</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">Thank you for registering with Viceroy Resort. Please use the verification code below to complete your registration:</p>
          <div style="background-color: #354638; color: #ffffff; padding: 18px 24px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 4px; margin: 28px 0; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #777; font-size: 12px; line-height: 1.6; text-align: center;">This code will expire in <strong>5 minutes</strong>. If you did not initiate this request, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    // If sending the actual email fails, cleanup pending OTP so state is not stale
    await OtpVerification.deleteMany({ email: normalizedEmail });
    console.error("Email sending failure:", emailError);
    const err = new Error(
      `Failed to send email to ${normalizedEmail}: ${emailError.message}`
    );
    err.statusCode = 500;
    throw err;
  }

  return {
    email: normalizedEmail,
    message: "OTP sent successfully to your email address",
  };
};

export const verifySignupOtpService = async ({ email, otp }) => {
  if (!email || !otp) {
    const error = new Error("Email and OTP code are required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = String(otp).trim();

  // Find the OTP document in MongoDB
  const pendingRecord = await OtpVerification.findOne({
    email: normalizedEmail,
    otp: trimmedOtp,
  });

  if (!pendingRecord) {
    const error = new Error(
      "Invalid or expired verification code. Please check or request a new code."
    );
    error.statusCode = 400;
    throw error;
  }

  // Condition check: Ensure user wasn't registered in the meantime
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    await OtpVerification.deleteMany({ email: normalizedEmail });
    const error = new Error(
      "This email is already registered. Please sign in to your account."
    );
    error.statusCode = 409;
    error.isRegistered = true;
    throw error;
  }

  // Create the permanent user account in MongoDB
  let newUser;
  try {
    newUser = await User.create({
      fullName: pendingRecord.fullName,
      email: pendingRecord.email,
      password: pendingRecord.password,
      role: "customer",
    });
  } catch (dbError) {
    if (dbError.code === 11000) {
      await OtpVerification.deleteMany({ email: normalizedEmail });
      const error = new Error(
        "This email is already registered. Please sign in."
      );
      error.statusCode = 409;
      error.isRegistered = true;
      throw error;
    }
    throw dbError;
  }

  // Remove the OTP record after successful registration
  await OtpVerification.deleteMany({ email: normalizedEmail });

  // Generate JWT token for auto-login
  const token = jwt.sign(
    { id: newUser._id, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      profilePhoto: newUser.profilePhoto || "",
    },
  };
};


export const sendForgotPasswordOtpService = async (email) => {
  if (!email || !email.trim()) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Verify that the user exists
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error("No account found with this email address.");
    error.statusCode = 404;
    throw error;
  }

  // Generate 6-digit OTP
  const otp = generateOTP();

  // Remove previous reset OTPs for this email
  await OtpVerification.deleteMany({
    email: normalizedEmail,
    purpose: "reset-password",
  });

  // Store new reset OTP in MongoDB (expires in 5 mins)
  await OtpVerification.create({
    email: normalizedEmail,
    otp,
    purpose: "reset-password",
  });

  console.log(`\n🔑 [PASSWORD RESET OTP] Generated code for ${normalizedEmail}: ${otp}\n`);

  // Send real email via nodemailer
  try {
    await sendEmail({
      to: normalizedEmail,
      subject: "Viceroy Resort - Password Reset Code",
      text: `Your Viceroy Resort password reset code is: ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e0dfd5; border-radius: 8px; background: #fdfcf9;">
          <h2 style="color: #354638; letter-spacing: 3px; font-weight: 500; text-align: center; margin-bottom: 24px;">VICEROY RESORT</h2>
          <p style="color: #292d27; font-size: 15px; line-height: 1.6;">Hello ${user.fullName},</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">We received a request to reset your Viceroy Resort account password. Please enter the verification code below to set a new password:</p>
          <div style="background-color: #354638; color: #ffffff; padding: 18px 24px; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 4px; margin: 28px 0; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #777; font-size: 12px; line-height: 1.6; text-align: center;">This code will expire in <strong>5 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (emailError) {
    await OtpVerification.deleteMany({
      email: normalizedEmail,
      purpose: "reset-password",
    });
    console.error("Password reset email failure:", emailError);
    const err = new Error(
      `Failed to send password reset email: ${emailError.message}`
    );
    err.statusCode = 500;
    throw err;
  }

  return {
    email: normalizedEmail,
    message: "Password reset code sent to your email",
  };
};

export const resetPasswordWithOtpService = async ({ email, otp, newPassword }) => {
  if (!email || !otp || !newPassword) {
    const error = new Error("Email, verification code, and new password are required");
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 8) {
    const error = new Error("Password must contain at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedOtp = String(otp).trim();

  // Find the reset OTP record
  const otpRecord = await OtpVerification.findOne({
    email: normalizedEmail,
    otp: trimmedOtp,
    purpose: "reset-password",
  });

  if (!otpRecord) {
    const error = new Error(
      "Invalid or expired verification code. Please check or request a new code."
    );
    error.statusCode = 400;
    throw error;
  }

  // Find the user
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    const error = new Error("User account not found");
    error.statusCode = 404;
    throw error;
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  user.password = hashedPassword;
  await user.save();

  // Delete all reset OTP records for this email
  await OtpVerification.deleteMany({
    email: normalizedEmail,
    purpose: "reset-password",
  });

  return {
    message: "Password reset successfully. Please sign in with your new password.",
  };
};



const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

export const googleLoginService = async (credential) => {
  if (!credential) {
    const error = new Error("Google credential is required");
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  // 2. Get verified Google user information
  const payload = ticket.getPayload();

  if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
    const error = new Error("Invalid Google account");
    error.statusCode = 401;
    throw error;
  }

  const {
    sub: googleId,
    email,
    name,
  } = payload;

  // 3. Find existing user
  let user = await User.findOne({ googleId });

  if (!user) {
    user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (user) {
      // Link Google ID to existing account
      user.googleId = googleId;
      await User.updateOne({ _id: user._id }, { $set: { googleId } });
    } else {
      // 4. Create new Google user (Google Signup)
      const sanitizedName = (name || "Viceroy Guest").replace(/[^a-zA-Z\s.'-]/g, "").trim() || "Viceroy Guest";
      user = await User.create({
        fullName: sanitizedName,
        email: email.toLowerCase(),
        googleId,
        role: "customer",
      });
    }
  }

  // 5. Generate your existing JWT
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // 6. Return user and token
  return {
    token,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto || "",
    },
  };
};