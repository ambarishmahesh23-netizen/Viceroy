
import generateOtp from "../utils/generateOtp.js";
import sendEmail from "../utils/sendEmail.js";
import OtpVerification from "../models/OtpVerification.js";


const otpService = async (email, purpose) => {
  // 1. Generate a six-digit OTP
  const otp = String(generateOtp());

  // 2. Remove any previous OTP for this email and purpose
  await OtpVerification.deleteMany({ email, purpose });

  // 3. Set the OTP expiry time to five minutes
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 4. Save OTP data in MongoDB
  await OtpVerification.create({
    email,
    otp,
    purpose,
    expiresAt,
  });

  // 5. Send the OTP to the user's email
  await sendEmail(email, otp);

  // 6. Display OTP in the terminal for development
  console.log(`OTP for ${email}: ${otp}`);

  return true;
};

export default otpService;
