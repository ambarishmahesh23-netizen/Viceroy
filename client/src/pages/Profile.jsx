import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  fetchAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  fetchMyBookings,
  cancelBooking,
  submitReview,
} from "../api/adminApi";
import { logoutUser } from "../api/authApi";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("bookings"); // "bookings", "details", "security"
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState("all");

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Notice
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({
      message: typeof msg === "string" ? msg : msg?.message || String(msg),
      type,
    });
    setTimeout(() => setToast(null), 4500);
  };

  const loadUserData = useCallback(async () => {
    try {
      const profile = await fetchAdminProfile();
      if (profile) {
        setUser(profile);
        setProfileForm({
          fullName: profile.fullName || "",
          email: profile.email || "",
          phone: profile.phone || "",
          address: profile.address || "",
        });
        localStorage.setItem("user", JSON.stringify(profile));
      }
    } catch (err) {
      console.warn("Could not reload profile:", err.message);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const data = await fetchMyBookings();
      setBookings(data || []);
    } catch (err) {
      console.error("Failed to load your reservations:", err.message);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    loadUserData();
    loadBookings();
  }, [loadUserData, loadBookings]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateAdminProfile(profileForm);
      setUser(res.user);
      localStorage.setItem("user", JSON.stringify(res.user));
      showToast("Personal details updated successfully!");
    } catch (err) {
      showToast("Failed to update profile: " + err.message, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await updateAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast("Password updated successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      showToast("Failed to update password: " + err.message, "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelReservation = async (id, ref) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel reservation #${ref}? A full refund will be initiated under resort cancellation policy.`
    );
    if (!confirmCancel) return;

    try {
      await cancelBooking(id, "Cancelled by guest via customer profile");
      showToast(`Reservation #${ref} has been cancelled.`);
      loadBookings();
    } catch (err) {
      showToast("Failed to cancel: " + err.message);
    }
  };

  const handleOpenReviewModal = (booking) => {
    setSelectedBookingForReview(booking);
    setReviewTitle(`Exceptional stay at ${booking.roomName}`);
    setReviewComment("");
    setReviewRating(5);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast("Please provide both a title and comment for your review.", "error");
      return;
    }

    setSubmittingReview(true);
    try {
      await submitReview({
        bookingId: selectedBookingForReview?._id,
        suiteName: selectedBookingForReview?.roomName,
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      showToast("Thank you! Your guest review has been submitted.");
      setReviewModalOpen(false);
    } catch (err) {
      showToast("Failed to submit review: " + err.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === "all") return true;
    return b.status === bookingFilter;
  });

  return (
    <div className="profile-page">
      <Navbar />

      <main className="profile-container">
        {/* Banner */}
        <section className="profile-header-banner">
          <div className="profile-user-left">
            <div className="profile-avatar">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "G"}
            </div>
            <div className="profile-user-info">
              <h1>{user?.fullName || "Guest Account"}</h1>
              <p>{user?.email}</p>
              <span className="profile-role-tag">
                {user?.role === "admin" ? "Resort Administrator" : "Verified Customer"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <Link
              to="/booking"
              className="btn-save-profile"
              style={{
                textDecoration: "none",
                background: "#c49d68",
                color: "#142217",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              + Book New Stay
            </Link>
            <button
              onClick={handleLogout}
              className="btn-save-profile"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* Tab Switcher */}
        <nav className="profile-tabs-nav">
          <button
            className={`profile-tab-btn ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => setActiveTab("bookings")}
          >
            📅 My Reservations ({bookings.length})
          </button>
          <button
            className={`profile-tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            👤 Personal Details
          </button>
          <button
            className={`profile-tab-btn ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            🔒 Password & Security
          </button>
        </nav>

        {/* TAB 1: RESERVATIONS */}
        {activeTab === "bookings" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={`btn-sm-action ${bookingFilter === "all" ? "btn-view-receipt" : ""}`}
                  style={{ background: bookingFilter === "all" ? "#142217" : "#ede7dd", color: bookingFilter === "all" ? "#fff" : "#333" }}
                  onClick={() => setBookingFilter("all")}
                >
                  All ({bookings.length})
                </button>
                <button
                  className="btn-sm-action"
                  style={{ background: bookingFilter === "confirmed" ? "#142217" : "#ede7dd", color: bookingFilter === "confirmed" ? "#fff" : "#333" }}
                  onClick={() => setBookingFilter("confirmed")}
                >
                  Confirmed
                </button>
                <button
                  className="btn-sm-action"
                  style={{ background: bookingFilter === "checked-in" ? "#142217" : "#ede7dd", color: bookingFilter === "checked-in" ? "#fff" : "#333" }}
                  onClick={() => setBookingFilter("checked-in")}
                >
                  Checked-In
                </button>
                <button
                  className="btn-sm-action"
                  style={{ background: bookingFilter === "cancelled" ? "#142217" : "#ede7dd", color: bookingFilter === "cancelled" ? "#fff" : "#333" }}
                  onClick={() => setBookingFilter("cancelled")}
                >
                  Cancelled
                </button>
              </div>

              <Link to="/booking" className="btn-sm-action btn-leave-review">
                Plan Another Residence →
              </Link>
            </div>

            {loadingBookings ? (
              <div className="profile-card-block" style={{ textAlign: "center" }}>
                <p>Loading your reservations...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="profile-card-block" style={{ textAlign: "center", padding: "40px" }}>
                <h2>No reservations found</h2>
                <p className="desc">You have no reservations matching this filter.</p>
                <Link to="/booking" className="btn-save-profile" style={{ textDecoration: "none", display: "inline-block" }}>
                  Explore Suites & Book Now
                </Link>
              </div>
            ) : (
              <div>
                {filteredBookings.map((b) => (
                  <article key={b._id} className="reservation-card">
                    <div className="res-header">
                      <div>
                        <span className="res-ref-tag">#{b.bookingReference}</span>
                        <strong style={{ marginLeft: "12px", fontSize: "16px", color: "#142217" }}>
                          {b.roomName}
                        </strong>
                        <span style={{ fontSize: "13px", color: "#666", marginLeft: "6px" }}>
                          ({b.roomCategory})
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`status-pill-badge ${b.status}`}>
                          {b.status}
                        </span>
                        <strong style={{ fontSize: "15px", color: "#142217" }}>
                          ₹{b.totalPrice?.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>

                    <div className="res-body-grid">
                      <div>
                        <span style={{ fontSize: "11px", color: "#8a7c6a", textTransform: "uppercase", fontWeight: "bold" }}>
                          Check-In
                        </span>
                        <div>
                          {new Date(b.checkIn).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <small style={{ color: "#666" }}>From 3:00 PM</small>
                      </div>

                      <div>
                        <span style={{ fontSize: "11px", color: "#8a7c6a", textTransform: "uppercase", fontWeight: "bold" }}>
                          Check-Out
                        </span>
                        <div>
                          {new Date(b.checkOut).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <small style={{ color: "#666" }}>Until 11:00 AM</small>
                      </div>

                      <div>
                        <span style={{ fontSize: "11px", color: "#8a7c6a", textTransform: "uppercase", fontWeight: "bold" }}>
                          Stay Details
                        </span>
                        <div>{b.nights} Night(s) · {b.roomsCount || 1} Room(s) · {b.guests} Guest(s)</div>
                        <small style={{ color: "#176d34", display: "block", marginTop: "2px" }}>
                          💳 {b.paymentMethod || "Razorpay"} · {b.paymentStatus ? `Payment ${b.paymentStatus}` : "Guaranteed"}
                          {b.razorpayPaymentId ? ` (${b.razorpayPaymentId})` : ""}
                        </small>
                      </div>

                      <div>
                        <span style={{ fontSize: "11px", color: "#8a7c6a", textTransform: "uppercase", fontWeight: "bold" }}>
                          Booked For
                        </span>
                        <div>{b.guestName}</div>
                        <small style={{ color: "#666" }}>{b.guestEmail}</small>
                      </div>
                    </div>

                    {/* Booked Room Numbers & Suites */}
                    {Array.isArray(b.suites) && b.suites.length > 0 ? (
                      <div style={{ marginTop: "12px", padding: "8px 12px", background: "#fbf8f3", border: "1px solid #eadfcb", borderRadius: "4px", fontSize: "13px" }}>
                        <strong style={{ color: "#8a7c6a", textTransform: "uppercase", fontSize: "11px" }}>Reserved Suites & Assigned Room Numbers:</strong>
                        <div style={{ marginTop: "4px" }}>
                          {b.suites.map((s, idx) => (
                            <div key={idx} style={{ margin: "3px 0" }}>
                              🏛️ <strong>{s.roomName}</strong> (Suite {s.roomNumber}) — {s.roomsCount} Room{s.roomsCount > 1 ? "s" : ""}:{" "}
                              <span style={{ color: "#1f7a3f", fontWeight: "bold" }}>
                                [Room {s.allocatedRoomNumbers?.length > 1 ? "Numbers" : "Number"}: {s.allocatedRoomNumbers?.length > 0 ? s.allocatedRoomNumbers.join(", ") : `${s.roomNumber}-1`}]
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: "8px", fontSize: "13px", color: "#444" }}>
                        🏛️ <strong>Suite {b.roomNumber || "101"}</strong> ({b.roomsCount || 1} Room) —{" "}
                        <span style={{ color: "#1f7a3f", fontWeight: "bold" }}>
                          [Room Number(s): {b.allocatedRoomNumbers?.length > 0 ? b.allocatedRoomNumbers.join(", ") : (b.roomNumber || "101-1")}]
                        </span>
                      </div>
                    )}

                    <div className="res-actions-strip">
                      <Link
                        to={`/booking/confirmation/${b.bookingReference}`}
                        className="btn-sm-action btn-view-receipt"
                      >
                        📄 View Receipt / Confirmation
                      </Link>

                      {(b.status === "confirmed" || b.status === "checked-in") && (
                        <button
                          onClick={() => handleCancelReservation(b._id, b.bookingReference)}
                          className="btn-sm-action btn-cancel-res"
                        >
                          ✕ Cancel Reservation
                        </button>
                      )}

                      {b.status !== "cancelled" && (
                        <button
                          onClick={() => handleOpenReviewModal(b)}
                          className="btn-sm-action btn-leave-review"
                        >
                          ⭐ Rate & Review Stay
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERSONAL DETAILS */}
        {activeTab === "details" && (
          <section className="profile-card-block">
            <h2>Personal Information</h2>
            <p className="desc">
              Manage your personal identity, contact details, and address for expedited resort check-in.
            </p>

            <form onSubmit={handleUpdateProfile}>
              <div className="form-grid-2">
                <div className="field-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, fullName: e.target.value })
                    }
                  />
                </div>

                <div className="field-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label>Contact Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, phone: e.target.value })
                    }
                  />
                </div>

                <div className="field-group">
                  <label>Account Role</label>
                  <input
                    type="text"
                    disabled
                    value={user?.role === "admin" ? "Resort Administrator" : "Customer"}
                    style={{ background: "#f0ece4", color: "#666" }}
                  />
                </div>
              </div>

              <div className="field-group">
                <label>Residential / Billing Address</label>
                <textarea
                  rows="2"
                  placeholder="Street, City, Postal Code, Country"
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, address: e.target.value })
                  }
                />
              </div>

              <div style={{ textAlign: "right", marginTop: "14px" }}>
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving Details..." : "Save Personal Details"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TAB 3: PASSWORD & SECURITY */}
        {activeTab === "security" && (
          <section className="profile-card-block">
            <h2>Account Security & Password</h2>
            <p className="desc">
              Ensure your account is protected with a strong password. Minimum 6 characters.
            </p>

            <form onSubmit={handleUpdatePassword}>
              <div className="field-group" style={{ maxWidth: "480px" }}>
                <label>Current Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-grid-2" style={{ maxWidth: "700px" }}>
                <div className="field-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="field-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: "16px" }}>
                <button
                  type="submit"
                  className="btn-save-profile"
                  disabled={savingPassword}
                >
                  {savingPassword ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* REVIEW SUBMISSION MODAL (Module 8) */}
      {reviewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h2>Share Your Stay Experience</h2>
              <button
                className="modal-close-btn"
                onClick={() => setReviewModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="modal-body">
                <div style={{ background: "#faf8f5", padding: "12px 16px", borderRadius: "6px", border: "1px solid #e7ded2" }}>
                  <span style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "#c49d68", fontWeight: "bold" }}>
                    Verified Stay Residence
                  </span>
                  <div style={{ fontSize: "15px", fontWeight: "bold", color: "#142217", marginTop: "2px" }}>
                    {selectedBookingForReview?.roomName}
                  </div>
                  <small style={{ color: "#666" }}>
                    Stay Ref: #{selectedBookingForReview?.bookingReference}
                  </small>
                </div>

                <div className="field-group">
                  <label>Overall Star Rating</label>
                  <div className="star-selector">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => setReviewRating(star)}
                        style={{ color: star <= reviewRating ? "#c49d68" : "#d5ccbe" }}
                      >
                        ★
                      </span>
                    ))}
                    <span style={{ fontSize: "14px", color: "#666", alignSelf: "center", marginLeft: "10px" }}>
                      ({reviewRating} of 5 stars)
                    </span>
                  </div>
                </div>

                <div className="field-group">
                  <label>Review Headline / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. An unhurried coastal paradise"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label>Your Review Comments *</label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Tell future guests about your stay, room comfort, hospitality, and dining..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReviewModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={submittingReview}
                >
                  {submittingReview ? "Submitting Review..." : "Publish Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`toast-notice ${toast.type === "error" ? "toast-error" : ""}`}>
          <span className="toast-icon">{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default Profile;
