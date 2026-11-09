import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendForgotPasswordOtp, resetPasswordWithOtp } from "../api/authApi";
import "../styles/Signup.css";

function ForgotPassword() {
  const navigate = useNavigate();

  // "email" -> enter registered email
  // "reset" -> enter 6-digit OTP & new password
  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Timer countdown for resending OTP
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send reset OTP
  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMsg("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      await sendForgotPasswordOtp(normalizedEmail);
      setStep("reset");
      setResendCooldown(60);
      setOtp("");
      setSuccessMsg("A 6-digit reset code has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await resetPasswordWithOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      navigate("/login", {
        state: {
          message: "Password reset successfully! Please sign in with your new password.",
        },
      });
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");

    try {
      setLoading(true);
      await sendForgotPasswordOtp(email.trim().toLowerCase());
      setResendCooldown(60);
      setSuccessMsg("A fresh reset code has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to resend reset code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup-page">
      <section className="signup-visual">
        <div className="signup-visual-overlay" />

        <Link to="/" className="signup-brand">
          <span className="brand-symbol">V</span>
          <span>
            VICEROY
            <small>RESORT & RETREATS</small>
          </span>
        </Link>

        <div className="signup-visual-content">
          <span className="eyebrow">ACCOUNT RECOVERY</span>

          <h1>
            Rediscover
            <br />
            your tranquil
            <br />
            <em>retreat.</em>
          </h1>

          <p>
            Secure and effortless access to your Viceroy Resort account
            and personalized reservations.
          </p>
        </div>

        <p className="visual-footer">
          A place to pause. A place to belong.
        </p>
      </section>

      <section className="signup-form-section">
        <div className="signup-form-wrapper">
          <div className="signup-mobile-brand">
            VICEROY <span>RESORT & RETREATS</span>
          </div>

          <p className="form-eyebrow">RECOVER YOUR ACCOUNT</p>

          {step === "email" ? (
            <>
              <h2>Reset password</h2>
              <p className="form-description">
                Enter your registered email address to receive a 6-digit password reset code.
              </p>

              <form onSubmit={handleSendOtp}>
                <div className="form-field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    autoComplete="email"
                    required
                  />
                </div>

                {error && (
                  <p className="signup-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="signup-submit"
                  type="submit"
                  disabled={loading || !email.trim()}
                >
                  {loading ? "Sending code..." : "Send Reset Code"}
                  {!loading && <span aria-hidden="true">→</span>}
                </button>
              </form>
            </>
          ) : (
            <>
              <span className="otp-badge">STEP 2 OF 2</span>
              <h2>Set new password</h2>
              <p className="form-description">
                Enter the 6-digit code sent to{" "}
                <span className="otp-target-email">{email}</span> and create your new password.
              </p>

              <form onSubmit={handleResetPassword}>
                <div className="form-field">
                  <label htmlFor="otp">Enter 6-digit code</label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="------"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="otp-input-field"
                    autoFocus
                    required
                  />
                  <small className="field-hint">
                    Code expires in 5 minutes.
                  </small>
                </div>

                <div className="form-field">
                  <label htmlFor="newPassword">New password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <small className="field-hint">
                    Use at least 8 characters.
                  </small>
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm new password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {successMsg && !error && (
                  <div className="otp-info-banner">
                    📬 {successMsg}
                  </div>
                )}

                {error && (
                  <p className="signup-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="signup-submit"
                  type="submit"
                  disabled={loading || otp.length !== 6 || newPassword.length < 8}
                >
                  {loading ? "Updating password..." : "Reset Password"}
                  {!loading && <span aria-hidden="true">✓</span>}
                </button>

                <div className="otp-actions">
                  <button
                    type="button"
                    className="otp-secondary-btn"
                    onClick={() => {
                      setStep("email");
                      setError("");
                    }}
                  >
                    ← Change email
                  </button>

                  <button
                    type="button"
                    className="otp-resend-btn"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="signup-login-link">
            Remembered your password? <Link to="/login">Sign in</Link>
          </div>

          <p className="signup-copyright">
            © {new Date().getFullYear()} Viceroy Resort. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
