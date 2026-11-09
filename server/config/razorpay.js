import Razorpay from "razorpay";
import "dotenv/config";

/**
 * Returns an instance of Razorpay with configured keys.
 */
export const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID || "";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "";

  return new Razorpay({
    key_id: key_id || "rzp_test_placeholder",
    key_secret: key_secret || "placeholder_secret",
  });
};

/**
 * Checks if real credentials have been supplied.
 */
export const isRazorpayConfigured = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    key_id &&
    key_secret &&
    !key_id.includes("placeholder") &&
    !key_secret.includes("placeholder")
  );
};

export default getRazorpayInstance;
