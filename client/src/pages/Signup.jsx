import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  sendSignupOtp,
  verifySignupOtp,
  checkEmailExists,
  googleLoginApi,
} from "../api/authApi";
import "../styles/Signup.css";

function Signup() {
  const navigate = useNavigate();

  // "details" -> personal info & password
  // "otp"     -> enter 6-digit code
  const [step, setStep] = useState("details");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

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

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    // If changing email, clear previous "already registered" status
    if (name === "email") {
      setIsAlreadyRegistered(false);
      setError("");
    }
  };

  // Optional real-time check when the user leaves the email field
  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && emailRegex.test(email)) {
      try {
        const result = await checkEmailExists(email);
        if (result.exists) {
          setIsAlreadyRegistered(true);
          setError("This email is already registered. Please sign in instead.");
        } else {
          setIsAlreadyRegistered(false);
        }
      } catch {
        // Silently ignore network checks on blur
      }
    }
  };

  // Step 1: Submit details and send OTP
  const handleSendOtp = async (event) => {
    if (event) event.preventDefault();
    setError("");

    if (isAlreadyRegistered) {
      setError("This email is already registered. Please sign in.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      await sendSignupOtp({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setStep("otp");
      setResendCooldown(60);
      setOtp("");
    } catch (err) {
      if (
        err.isRegistered ||
        err.status === 409 ||
        err.message?.toLowerCase().includes("already registered")
      ) {
        setIsAlreadyRegistered(true);
        setError("This email is already registered with Viceroy Resort.");
      } else {
        setError(err.message || "Unable to send verification code.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize account creation
  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");

    if (!otp || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);

      const response = await verifySignupOtp({
        email: formData.email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      // Store user and token in localStorage so user is recognized across the app
      if (response?.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
      }
      if (response?.token) {
        localStorage.setItem("token", response.token);
      }

      // Route immediately to the logged-in booking page
      navigate(response?.user?.role === "admin" ? "/admin" : "/booking", {
        replace: true,
        state: {
          message: `Welcome to Viceroy Resort, ${response?.user?.fullName || ""}!`,
        },
      });
    } catch (err) {
      if (
        err.isRegistered ||
        err.status === 409 ||
        err.message?.toLowerCase().includes("already registered")
      ) {
        setIsAlreadyRegistered(true);
        setError("This email is already registered. Please sign in.");
      } else {
        setError(err.message || "Invalid or expired verification code.");
      }
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
      await sendSignupOtp({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-up
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError("");
      const credential = credentialResponse?.credential;
      if (!credential) {
        throw new Error("No Google credential received. Please try again.");
      }
      const data = await googleLoginApi(credential);
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      window.dispatchEvent(new Event("user_updated"));
      navigate(data?.user?.role === "admin" ? "/admin" : "/booking", {
        replace: true,
        state: {
          message: `Welcome to Viceroy Resort, ${data?.user?.fullName || ""}!`,
        },
      });
    } catch (err) {
      setError(err.message || "Failed to sign up with Google.");
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
          <span className="eyebrow">A WORLD OF SERENITY</span>

          <h1>
            Your next
            <br />
            escape begins
            <br />
            <em>here.</em>
          </h1>

          <p>
            Discover exceptional stays, thoughtful details,
            and unforgettable moments at Viceroy Resort.
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

          <p className="form-eyebrow">WELCOME TO VICEROY</p>

          {/* Centered Sign In / Sign Up option switcher */}
          <div className="signup-auth-toggle">
            <span className="toggle-tab active">Create Account</span>
            <span className="toggle-divider">/</span>
            <Link to="/login" className="toggle-tab link">
              Sign In Instead
            </Link>
          </div>

          {step === "details" ? (
            <>
              <h2>Create your account</h2>
              <p className="form-description">
                Join us and make your next getaway memorable.
              </p>

              {/* Google Sign-up Option */}
              <div style={{ margin: "20px 0 16px", display: "flex", justifyContent: "center", width: "100%" }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Sign-up was cancelled or failed. Please try again.")}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="signup_with"
                  width="100%"
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0 24px" }}>
                <span style={{ flex: 1, height: "1px", background: "#e5ddd5" }}></span>
                <span style={{ fontSize: "11px", letterSpacing: "1px", color: "#8a817b", textTransform: "uppercase", fontWeight: "700" }}>
                  or register with email
                </span>
                <span style={{ flex: 1, height: "1px", background: "#e5ddd5" }}></span>
              </div>

              <form onSubmit={handleSendOtp}>
                <div className="form-field">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}
                    autoComplete="email"
                    required
                  />
                </div>

                {isAlreadyRegistered && (
                  <div className="registered-alert-banner" role="alert">
                    <p>
                      An account with this email address already exists.
                    </p>
                    <Link to="/login" className="registered-signin-btn">
                      Sign in to your account →
                    </Link>
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="password">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
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
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Enter your password again"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
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

                {error && !isAlreadyRegistered && (
                  <p className="signup-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="signup-submit"
                  type="submit"
                  disabled={loading || isAlreadyRegistered}
                >
                  {loading
                    ? "Sending verification code..."
                    : "Continue with verification"}
                  {!loading && <span aria-hidden="true">→</span>}
                </button>

                {/* Prominently centered Sign In option */}
                <div className="signup-signin-center">
                  <span>Already have an account?</span>{" "}
                  <Link to="/login" className="signup-signin-link-bold">
                    Sign In →
                  </Link>
                </div>

                <p className="terms-text">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms">Terms of Service</Link> and{" "}
                  <Link to="/privacy">Privacy Policy</Link>.
                </p>
              </form>
            </>
          ) : (
            <>
              <span className="otp-badge">STEP 2 OF 2</span>
              <h2>Verify your email</h2>
              <p className="form-description">
                We sent a 6-digit code to{" "}
                <span className="otp-target-email">{formData.email}</span>.
              </p>

              <form onSubmit={handleVerifyOtp}>
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

                <div className="otp-info-banner">
                  📬 Please check your inbox or spam folder. If running locally without live email credentials, check the server terminal for the code.
                </div>

                {error && (
                  <p className="signup-error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="signup-submit"
                  type="submit"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify & Create Account"}
                  {!loading && <span aria-hidden="true">✓</span>}
                </button>

                <div className="otp-actions">
                  <button
                    type="button"
                    className="otp-secondary-btn"
                    onClick={() => {
                      setStep("details");
                      setError("");
                    }}
                  >
                    ← Edit details / change email
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

          <div className="signup-login-link centered">
            <span>Already have an account?</span> <Link to="/login">Sign In</Link>
          </div>

          <p className="signup-copyright">
            © {new Date().getFullYear()} Viceroy Resort. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Signup;
