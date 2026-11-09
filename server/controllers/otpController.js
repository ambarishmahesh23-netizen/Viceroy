
import otpService from "../services/otpService.js";

export async function sendSignupOtp(req, res) {
  try {
    const { email } = req.body;

    // 1. Check email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // 2. Generate OTP, save it in MongoDB, and send email
    await otpService(email, "signup");

    // 3. Send success response
    return res.status(200).json({
      success: true,
      message: "Signup OTP sent successfully",
    });

  } catch (error) {
    console.error("Send signup OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate or send OTP",
    });
  }
}
