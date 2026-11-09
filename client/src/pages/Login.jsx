import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { loginUser, logoutUser, googleLoginApi } from "../api/authApi";
import "../styles/Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectParam = new URLSearchParams(location.search).get("redirect");

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  }

  function handleAuthSuccess(user, token) {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    if (token) {
      localStorage.setItem("token", token);
    }

    // Notify other components & navigation bars
    window.dispatchEvent(new Event("user_updated"));

    // Navigate to requested redirect or smart landing page
    if (redirectParam) {
      navigate(redirectParam);
    } else if (user?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/booking");
    }
  }

  // Google OAuth Success Handler (Works for Login)
  async function handleGoogleSuccess(credentialResponse) {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        throw new Error("No credential received from Google. Please try again.");
      }

      const data = await googleLoginApi(credential);
      handleAuthSuccess(data.user, data.token);
    } catch (err) {
      console.error("Google authentication error:", err);
      setError(err.message || "Failed to authenticate with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError("Google Sign-In was cancelled or could not be completed. Please try again or use email sign-in.");
  }

  // Email / Password Form Submit Handler
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const data = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      handleAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || "Unable to connect to the authentication service.");
    } finally {
      setLoading(false);
    }
  }

  // Active Session Logout
  async function handleLogout() {
    setLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      setError("");
      setSuccess("You have been signed out successfully.");
    } catch (err) {
      setError("Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      {/* Visual Brand Pane (Left Column) */}
      <section className="login-visual">
        <div className="login-visual-overlay" />

        <div className="login-brand-header">
          <Link to="/" className="login-brand-logo">
            <span className="brand-text-main">VICEROY</span>
            <span className="brand-text-dot">.</span>
            <span className="brand-text-sub">Resort & Retreats</span>
          </Link>
        </div>

        <div className="visual-content">
          <div className="visual-badge">
            <span>✨</span> Curated Coastal Luxury
          </div>

          <h1>
            Your private escape,
            <br />
            <em>reimagined.</em>
          </h1>

          <p className="visual-description">
            Sign in to manage your luxury residence bookings, tailored concierge services,
            and exclusive member experiences at Viceroy Resort.
          </p>

          <div className="visual-features-grid">
            <div className="visual-feature-item">
              <span className="visual-feature-icon">🌊</span>
              <strong>Oceanfront Suites</strong>
              <span>Panoramic sea vistas</span>
            </div>

            <div className="visual-feature-item">
              <span className="visual-feature-icon">🛎️</span>
              <strong>Butler Service</strong>
              <span>Dedicated 24/7 care</span>
            </div>

            <div className="visual-feature-item">
              <span className="visual-feature-icon">🍽️</span>
              <strong>Fine Dining</strong>
              <span>Michelin gastronomy</span>
            </div>
          </div>
        </div>

        <div className="visual-footer">
          <span className="visual-quote">“A place to pause. A place to belong.”</span>
          <span>© {new Date().getFullYear()} Viceroy Resort</span>
        </div>
      </section>

      {/* Interactive Form Pane (Right Column) */}
      <section className="login-form-pane">
        <Link
          to={currentUser ? (currentUser.role === "admin" ? "/admin" : "/booking") : "/"}
          className="back-home-link"
        >
          {currentUser ? "← Return to Bookings" : "← Return to Resort Homepage"}
        </Link>

        <div className="login-card">
          {/* If already signed in, show a friendly member card */}
          {currentUser ? (
            <div className="already-signed-card">
              <div className="user-avatar-circle">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "G"}
              </div>

              <h3>Already Signed In</h3>
              <p className="user-card-name">{currentUser.fullName}</p>
              <p className="user-card-email">{currentUser.email}</p>

              <span className="user-role-badge">
                {currentUser.role === "admin" ? "Resort Administrator" : "Verified Guest Member"}
              </span>

              <div className="signed-in-actions-stack">
                {currentUser.role === "admin" && (
                  <Link to="/admin" className="btn-proceed-admin">
                    Go to Admin Portal →
                  </Link>
                )}

                <Link
                  to={redirectParam || (currentUser.role === "admin" ? "/admin" : "/booking")}
                  className="btn-proceed-main"
                >
                  Continue to Booking & Residences →
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-switch-user"
                  disabled={loading}
                >
                  {loading ? "Signing out..." : "Sign Out / Switch Account"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Form Title & Subtitle */}
              <div className="form-header">
                <h2>Welcome back</h2>
                <p>Enter your credentials to access your account & reservations.</p>
              </div>

              {/* Redirect notice (e.g. redirected from booking page) */}
              {redirectParam === "/booking" && (
                <div className="booking-context-banner">
                  <span className="icon">🔒</span>
                  <span>Please sign in to complete and confirm your suite booking.</span>
                </div>
              )}

              {/* Alert Notification Banner (Replaces JS alerts) */}
              {error && (
                <div className="login-alert-banner error" role="alert">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-text">{error}</div>
                  <button
                    type="button"
                    className="alert-dismiss"
                    onClick={() => setError("")}
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              {success && (
                <div className="login-alert-banner success" role="alert">
                  <span className="alert-icon">✓</span>
                  <div className="alert-text">{success}</div>
                  <button
                    type="button"
                    className="alert-dismiss"
                    onClick={() => setSuccess("")}
                    aria-label="Dismiss message"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Google Sign-in Button */}
              <div className="google-auth-section">
                <div className="google-btn-wrapper">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_black"
                    shape="pill"
                    size="large"
                    text="continue_with"
                    width="100%"
                  />
                </div>
              </div>

              <div className="login-divider-line">
                <span />
                <p>or sign in with email</p>
                <span />
              </div>

              {/* Email + Password Form */}
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="form-field-group">
                  <label htmlFor="auth-email">Email Address</label>
                  <div className="input-with-icon">
                    <span className="input-icon-prefix">✉️</span>
                    <input
                      id="auth-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label htmlFor="auth-password">
                    <span>Password</span>
                    <Link to="/forgot-password" className="forgot-password-link">
                      Forgot password?
                    </Link>
                  </label>

                  <div className="input-with-icon">
                    <span className="input-icon-prefix">🔒</span>
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                    />

                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="form-options-row">
                  <label className="remember-checkbox-label">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>Remember me</span>
                  </label>

                  <span className="security-badge">
                    <span>🛡️</span> 256-Bit Encrypted
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn-auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-dot" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Quick Switch Prompt */}
              <p className="auth-switch-prompt">
                New to Viceroy Resort?{" "}
                <Link to="/signup">Create an account</Link>
              </p>

              <p className="legal-privacy-text">
                By continuing, you agree to Viceroy Resort's{" "}
                <Link to="/terms">Terms of Service</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>.
              </p>
            </>
          )}
        </div>

        <footer className="login-pane-footer">
          Viceroy Resort & Residences • Coastal Sanctuary
        </footer>
      </section>
    </main>
  );
}

export default Login;
