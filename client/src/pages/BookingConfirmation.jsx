import React, { useState, useEffect } from "react";
import { useLocation, useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchBookingById } from "../api/adminApi";
import "./BookingConfirmation.css";

const resolveImgUrl = (url) => {
  if (!url) return "/images/munnar-room-living.jpg";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  if (url.startsWith("/uploads/")) {
    return `http://localhost:4000${url}`;
  }
  return url;
};

const getCategoryTagline = (category = "", name = "") => {
  const combined = `${category} ${name}`.toLowerCase();
  if (combined.includes("garden")) return "Private villa surrounded by greenery";
  if (combined.includes("presidential")) return "Premium accommodation with multiple rooms";
  return "Multiple beds and space for families";
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const [y, m, d] = String(dateString).includes("T")
    ? dateString.split("T")[0].split("-").map(Number)
    : String(dateString).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();

  // Check if this confirmation visit is for a failed payment
  const isFailed =
    location.state?.status === "failed" ||
    location.state?.paymentStatus === "failed";

  const failureReason =
    location.state?.failureReason ||
    location.state?.error ||
    "Payment authorization was declined by your bank or the transaction was cancelled.";

  const failedDetails = location.state?.failedPaymentDetails || null;
  const bookingDraft = location.state?.bookingDraft || null;
  const draftData = failedDetails || bookingDraft || {};

  const [booking, setBooking] = useState(() => {
    if (isFailed) return null;
    if (location.state?.booking) return location.state.booking;
    try {
      const stored = localStorage.getItem("latest_booking");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!isFailed && !booking && !!id);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFailed && !booking && id) {
      setLoading(true);
      fetchBookingById(id)
        .then((data) => {
          setBooking(data);
        })
        .catch((err) => {
          setError(err.message || "Could not retrieve booking details");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, booking, isFailed]);

  const handlePrint = () => {
    window.print();
  };

  const handleRetryPayment = () => {
    // Clear failure flag so user starts fresh on payment edit
    sessionStorage.removeItem("viceroy_last_payment_status");
    sessionStorage.removeItem("viceroy_last_payment_error");
    const stateToPass = failedDetails || bookingDraft || null;
    navigate("/payment", { state: { bookingState: stateToPass } });
  };

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="confirmation-page">
        <Navbar />
        <div className="confirmation-container" style={{ textAlign: "center", paddingTop: "80px" }}>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#556457", fontSize: "16px", fontFamily: "Georgia, serif" }}>
            Retrieving your reservation confirmation...
          </p>
        </div>
      </div>
    );
  }

  // 2. PAYMENT FAILED / TRANSACTION DECLINED STATE
  if (isFailed) {
    const failedSuites =
      draftData.selectedSuitesList ||
      (draftData.suites
        ? draftData.suites.map((s) => ({ suite: s, roomsCount: s.roomsCount || 1 }))
        : []);

    return (
      <div className="confirmation-page">
        <Navbar />

        <main className="confirmation-container">
          <div className="confirmation-hero-card" style={{ border: "1px solid #f5c6cb" }}>
            {/* Header Banner - Red Accent for Payment Failed */}
            <header className="confirmation-banner failed-banner">
              <div className="confirmation-check-badge failed-badge">✕</div>
              <h1>Payment Unsuccessful</h1>
              <p>
                We were unable to process your payment for Viceroy Resort Munnar.
                <strong> No amount has been deducted from your bank account.</strong>
              </p>

              <div
                className="ref-pill-box"
                style={{
                  borderColor: "rgba(220, 53, 69, 0.4)",
                  background: "rgba(220, 53, 69, 0.15)",
                  color: "#ffc2c0",
                }}
              >
                TRANSACTION STATUS: <strong style={{ color: "#ff8585" }}>FAILED / DECLINED</strong>
              </div>
            </header>

            {/* Main Body */}
            <div className="confirmation-body">
              {/* Failure Explanation Alert Box */}
              <div className="failure-reason-box">
                <div style={{ fontSize: "28px", lineHeight: 1 }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 6px", fontSize: "16px", color: "#a82e2e" }}>
                    Why did this transaction fail?
                  </h4>
                  <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#721c24", fontWeight: "600" }}>
                    Reported Reason: {failureReason}
                  </p>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "18px",
                      fontSize: "13px",
                      color: "#666",
                      lineHeight: "1.6",
                    }}
                  >
                    <li>Bank authorization declined or daily online transaction limit reached.</li>
                    <li>Incorrect OTP entered, 3D-Secure timeout, or cancelled during verification.</li>
                    <li>Temporary network interruption between your bank and the payment gateway.</li>
                  </ul>
                </div>
              </div>

              {/* Attempted Itinerary Details */}
              <div>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#142217", margin: "0 0 14px" }}>
                  Attempted Reservation Details (Held in Session)
                </h3>

                {failedSuites.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                    {failedSuites.map((item, idx) => {
                      const s = item.suite || item;
                      const sName = s.name || s.roomName || "Munnar Highland Villa";
                      const sCat = s.category || s.roomCategory || "Highland Suite";
                      const sTagline = getCategoryTagline(sCat, sName);
                      const sImg = resolveImgUrl(s.image || s.roomImage);

                      return (
                        <div key={idx} className="suite-confirmed-card" style={{ borderLeft: "4px solid #dc3545" }}>
                          <div className="suite-confirmed-img">
                            <img src={sImg} alt={sName} />
                          </div>
                          <div className="suite-confirmed-details">
                            <span className="category" style={{ color: "#a82e2e" }}>
                              {sCat} · SUITE {s.roomNumber || "101"}
                            </span>
                            <h2>{sName}</h2>
                            <p style={{ fontStyle: "italic", color: "#8c6f44", marginBottom: "4px" }}>
                              "{sTagline}"
                            </p>
                            <p>
                              Occupancy: {item.roomsCount || 1} Room(s) · Up to {s.capacity || 4} Guests
                            </p>
                            <p style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                              Rate: ₹{(s.pricePerNight || s.price || 15000).toLocaleString("en-IN")} / night
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "16px 20px",
                      background: "#faf8f5",
                      border: "1px solid #e7dfd3",
                      borderRadius: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "14px", color: "#444" }}>
                      Residence: <strong>Highland Sanctuary Munnar</strong>
                    </p>
                  </div>
                )}

                {/* Itinerary Grid */}
                <div className="itinerary-grid">
                  <div className="itinerary-box">
                    <div className="itinerary-label">Check-In Date</div>
                    <div className="itinerary-date">{formatDate(draftData.checkIn)}</div>
                    <div className="itinerary-time">From 3:00 PM onwards</div>
                  </div>

                  <div className="itinerary-box">
                    <div className="itinerary-label">Check-Out Date</div>
                    <div className="itinerary-date">{formatDate(draftData.checkOut)}</div>
                    <div className="itinerary-time">Until 11:00 AM</div>
                  </div>
                </div>
              </div>

              {/* Price Table with Unpaid Notice */}
              <section className="summary-table-section">
                <h3>Payment Status Summary</h3>
                <table className="summary-table">
                  <tbody>
                    <tr>
                      <td>Stay Duration</td>
                      <td>{draftData.nights || 1} Night(s)</td>
                    </tr>
                    <tr>
                      <td>Total Rooms</td>
                      <td>{draftData.totalSelectedRooms || 1} Suite(s)</td>
                    </tr>
                    <tr>
                      <td>Payment Method Attempted</td>
                      <td>{draftData.paymentMethod || "Razorpay Gateway"}</td>
                    </tr>
                    <tr>
                      <td>Payment Status</td>
                      <td>
                        <span className="failure-status-pill">● PAYMENT FAILED (UNPAID)</span>
                      </td>
                    </tr>
                    <tr className="total-row">
                      <td>Total Amount Due</td>
                      <td style={{ color: "#a82e2e" }}>
                        ₹{(draftData.totalPrice || 0).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Reassurance Message Box */}
              <div
                style={{
                  background: "#f4f8f4",
                  border: "1px solid #c7e5cf",
                  borderRadius: "6px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "22px" }}>💡</span>
                <p style={{ margin: 0, fontSize: "13px", color: "#1e5e31", lineHeight: "1.5" }}>
                  <strong>Next Step:</strong> Your room configuration and dates have been kept intact. You can click <strong>"Retry Payment Now"</strong> to try another card, UPI (Google Pay, PhonePe), or select <strong>"Pay Upon Arrival at Resort"</strong> to instantly guarantee your booking without online payment.
                </p>
              </div>
            </div>

            {/* Action Footer for Failed Payment */}
            <footer className="confirmation-actions" style={{ background: "#fffdfd", borderTop: "1px solid #f5c6cb" }}>
              <button onClick={handleRetryPayment} className="btn-retry-payment">
                🔄 Retry Payment Now
              </button>

              <button
                type="button"
                onClick={handleRetryPayment}
                className="btn-home-return"
                style={{ background: "#ffffff", border: "1px solid #c49d68", color: "#8c6f44" }}
              >
                💳 Change Payment Method
              </button>

              <Link to="/booking" className="btn-home-return">
                📅 Modify Stay Dates / Rooms
              </Link>

              <Link to="/" className="btn-home-return">
                🏠 Return to Home
              </Link>
            </footer>
          </div>
        </main>
      </div>
    );
  }

  // 3. NO ACTIVE RESERVATION FOUND FALLBACK
  if (error || !booking) {
    return (
      <div className="confirmation-page">
        <Navbar />
        <div className="confirmation-container" style={{ textAlign: "center", paddingTop: "60px" }}>
          <div className="confirmation-hero-card" style={{ padding: "48px 24px" }}>
            <h2 style={{ fontFamily: "Georgia, serif", color: "#142217" }}>No Active Reservation Found</h2>
            <p style={{ color: "#667268", margin: "12px 0 24px" }}>
              {error ||
                "We could not find reservation details for this session. Please visit the reservations page to plan your stay."}
            </p>
            <Link to="/booking" className="btn-print" style={{ display: "inline-flex", textDecoration: "none" }}>
              Book a Residence →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. PAYMENT SUCCESSFUL & RESERVATION CONFIRMED STATE
  return (
    <div className="confirmation-page">
      <Navbar />

      <main className="confirmation-container">
        <div className="confirmation-hero-card">
          {/* Header Banner - Success Forest Green */}
          <header className="confirmation-banner">
            <div className="confirmation-check-badge">✓</div>
            <h1>Payment Successful & Reservation Confirmed</h1>
            <p>
              Thank you, <strong>{booking.guestName}</strong>! Your luxury highland stay at Viceroy Resort Munnar is 100% guaranteed. An itinerary summary and official payment receipt have been sent to <strong>{booking.guestEmail}</strong>.
            </p>

            <div className="ref-pill-box">
              CONFIRMATION NO: <strong>{booking.bookingReference}</strong> · STATUS: <strong>PAID & GUARANTEED</strong>
            </div>
          </header>

          {/* Main Body */}
          <div className="confirmation-body">
            {/* Success Verification Alert */}
            <div
              style={{
                background: "linear-gradient(135deg, #eaf6ee 0%, #d8f0df 100%)",
                border: "1px solid #7bc691",
                borderRadius: "8px",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🛡️</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#176d34", fontFamily: "Georgia, serif" }}>
                    Payment Verified & Residence Secured
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#2d603a" }}>
                    Transaction processed via {booking.paymentMethod || "Razorpay Gateway"}. Your reservation is officially logged in our resort front-desk directory.
                  </p>
                </div>
              </div>
              <span
                style={{
                  background: "#1f7a3f",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "4px 10px",
                  borderRadius: "14px",
                  letterSpacing: "0.5px",
                }}
              >
                ● 100% VERIFIED
              </span>
            </div>

            {/* Suites Card(s) with Category & Tagline */}
            {Array.isArray(booking.suites) && booking.suites.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "8px" }}>
                {booking.suites.map((s, idx) => {
                  const sName = s.roomName || "Munnar Highland Villa";
                  const sCat = s.roomCategory || "Highland Suite";
                  const sTagline = getCategoryTagline(sCat, sName);
                  const sImg = resolveImgUrl(s.roomImage || booking.roomImage);

                  return (
                    <div key={idx} className="suite-confirmed-card">
                      <div className="suite-confirmed-img">
                        <img
                          src={sImg}
                          alt={sName}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/images/munnar-room-living.jpg";
                          }}
                        />
                      </div>

                      <div className="suite-confirmed-details">
                        <span className="category">
                          {sCat} · SUITE {s.roomNumber || "101"}
                        </span>
                        <h2>{sName}</h2>
                        <p style={{ fontStyle: "italic", color: "#8c6f44", marginBottom: "4px" }}>
                          "{sTagline}"
                        </p>
                        <p>
                          Booked: <strong>{s.roomsCount || 1} Room{s.roomsCount > 1 ? "s" : ""}</strong> · Allocated Room Number(s):{" "}
                          <strong style={{ color: "#1f7a3f" }}>
                            {s.allocatedRoomNumbers && s.allocatedRoomNumbers.length > 0
                              ? s.allocatedRoomNumbers.join(", ")
                              : `Room ${s.roomNumber || "101"}-1`}
                          </strong>
                        </p>
                        <p style={{ margin: "4px 0 0", color: "#8c6f44", fontSize: "13px" }}>
                          Rate: ₹{(s.pricePerNight || 15000).toLocaleString("en-IN")} / room / night
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="suite-confirmed-card">
                <div className="suite-confirmed-img">
                  <img
                    src={resolveImgUrl(booking.roomImage)}
                    alt={booking.roomName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/munnar-room-living.jpg";
                    }}
                  />
                </div>

                <div className="suite-confirmed-details">
                  <span className="category">
                    {booking.roomCategory || "Highland Villa"} · SUITE {booking.roomNumber || "101"}
                  </span>
                  <h2>{booking.roomName}</h2>
                  <p style={{ fontStyle: "italic", color: "#8c6f44", marginBottom: "4px" }}>
                    "{getCategoryTagline(booking.roomCategory, booking.roomName)}"
                  </p>
                  <p>
                    Occupancy: Up to {booking.guests} Guest(s) · {booking.roomsCount || 1} Room(s)
                  </p>
                  <p style={{ marginTop: "4px" }}>
                    Allocated Room Number(s):{" "}
                    <strong style={{ color: "#1f7a3f" }}>
                      {booking.allocatedRoomNumbers && booking.allocatedRoomNumbers.length > 0
                        ? booking.allocatedRoomNumbers.join(", ")
                        : booking.roomNumber || "101-1"}
                    </strong>
                  </p>
                </div>
              </div>
            )}

            {/* Check-In & Check-Out Grid */}
            <div className="itinerary-grid">
              <div className="itinerary-box">
                <div className="itinerary-label">Check-In Date</div>
                <div className="itinerary-date">{formatDate(booking.checkIn)}</div>
                <div className="itinerary-time">From 3:00 PM onwards</div>
              </div>

              <div className="itinerary-box">
                <div className="itinerary-label">Check-Out Date</div>
                <div className="itinerary-date">{formatDate(booking.checkOut)}</div>
                <div className="itinerary-time">Until 11:00 AM</div>
              </div>
            </div>

            {/* Price & Billing Breakdown */}
            <section className="summary-table-section">
              <h3>Reservation & Payment Summary</h3>
              <table className="summary-table">
                <tbody>
                  <tr>
                    <td>Residence Rate ({booking.nights} Night{booking.nights > 1 ? "s" : ""})</td>
                    <td>₹{(booking.pricePerNight || 15000).toLocaleString("en-IN")} / night</td>
                  </tr>
                  <tr>
                    <td>Number of Residences Booked</td>
                    <td>{booking.roomsCount || 1} Suite(s)</td>
                  </tr>
                  <tr>
                    <td>Resort Services, Taxes & Valet</td>
                    <td style={{ color: "#1f7a3f" }}>Included (FREE)</td>
                  </tr>
                  <tr>
                    <td>Reservation Status</td>
                    <td style={{ color: "#1f7a3f", textTransform: "uppercase", fontWeight: "bold" }}>
                      ● Guaranteed
                    </td>
                  </tr>
                  <tr>
                    <td>Payment Method</td>
                    <td style={{ fontWeight: 600 }}>
                      {booking.paymentMethod === "Wallet"
                        ? "💳 Viceroy Guest Wallet"
                        : booking.paymentMethod || "Razorpay Gateway"}
                    </td>
                  </tr>
                  <tr>
                    <td>Payment Status</td>
                    <td>
                      <span
                        style={{
                          background: "#eaf6ee",
                          color: "#1f7a3f",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        ● {booking.paymentStatus === "refunded" ? "REFUNDED" : "PAID (VERIFIED)"}
                      </span>
                    </td>
                  </tr>

                  {booking.paymentMethod === "Wallet" && (
                    <tr style={{ background: "#fbf8f3" }}>
                      <td style={{ color: "#142217", fontWeight: 600 }}>Wallet Transaction</td>
                      <td style={{ color: "#1e5e31", fontWeight: 600 }}>
                        ✓ ₹{booking.totalPrice?.toLocaleString("en-IN")} debited from your Viceroy Guest Wallet balance
                      </td>
                    </tr>
                  )}

                  {booking.transactionId && (
                    <tr>
                      <td>Transaction ID</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{booking.transactionId}</td>
                    </tr>
                  )}
                  {booking.razorpayOrderId && (
                    <tr>
                      <td>Razorpay Order ID</td>
                      <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{booking.razorpayOrderId}</td>
                    </tr>
                  )}
                  <tr className="total-row">
                    <td>Total Amount Paid</td>
                    <td style={{ color: "#142217" }}>₹{booking.totalPrice?.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Guest Information */}
            <section className="summary-table-section">
              <h3>Guest Contact Details</h3>
              <table className="summary-table">
                <tbody>
                  <tr>
                    <td>Primary Guest</td>
                    <td>{booking.guestName}</td>
                  </tr>
                  <tr>
                    <td>Contact Email</td>
                    <td>{booking.guestEmail}</td>
                  </tr>
                  {booking.guestPhone && (
                    <tr>
                      <td>Contact Phone</td>
                      <td>{booking.guestPhone}</td>
                    </tr>
                  )}
                  {booking.notes && (
                    <tr>
                      <td>Special Notes</td>
                      <td>"{booking.notes}"</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            {/* Welcome Perks Box */}
            <div className="welcome-perks-box">
              <h4>🌿 Included with Your Munnar Stay:</h4>
              <ul>
                <li>Personalized in-suite concierge check-in and highland luggage valet</li>
                <li>Daily complimentary artisan plantation breakfast with Kerala estate tea</li>
                <li>Full access to private misty valley wellness pool and fitness pavilion</li>
                <li>High-speed fiber optic Wi-Fi throughout all hillside suites</li>
              </ul>
            </div>
          </div>

          {/* Action Footer */}
          <footer className="confirmation-actions">
            <button onClick={handlePrint} className="btn-print">
              🖨️ Print / Save Receipt
            </button>
            <Link to="/booking" className="btn-home-return">
              Book Another Residence →
            </Link>
            <Link
              to="/profile"
              className="btn-home-return"
              style={{ background: "#f4eee2", color: "#142217" }}
            >
              My Stays & Profile
            </Link>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default BookingConfirmation;
