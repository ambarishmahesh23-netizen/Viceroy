import React, { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchBookingById } from "../api/adminApi";
import "./BookingConfirmation.css";

function BookingConfirmation() {
  const location = useLocation();
  const { id } = useParams();

  const [booking, setBooking] = useState(() => {
    if (location.state?.booking) return location.state.booking;
    try {
      const stored = localStorage.getItem("latest_booking");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!booking && !!id);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking && id) {
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
  }, [id, booking]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="confirmation-page">
        <Navbar />
        <div className="confirmation-container" style={{ textAlign: "center", paddingTop: "80px" }}>
          <p style={{ color: "#556457", fontSize: "16px" }}>Retrieving your reservation confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="confirmation-page">
        <Navbar />
        <div className="confirmation-container" style={{ textAlign: "center", paddingTop: "60px" }}>
          <div className="confirmation-hero-card" style={{ padding: "48px 24px" }}>
            <h2 style={{ fontFamily: "Georgia, serif", color: "#142217" }}>No Active Reservation Found</h2>
            <p style={{ color: "#667268", margin: "12px 0 24px" }}>
              {error || "We could not find reservation details for this session. Please visit the reservations page to plan your stay."}
            </p>
            <Link to="/booking" className="btn-print" style={{ display: "inline-flex", textDecoration: "none" }}>
              Book a Residence →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirmation-page">
      <Navbar />

      <main className="confirmation-container">
        <div className="confirmation-hero-card">
          {/* Header Banner */}
          <header className="confirmation-banner">
            <div className="confirmation-check-badge">✓</div>
            <h1>Reservation Confirmed</h1>
            <p>
              Thank you, <strong>{booking.guestName}</strong>. Your luxury coastal stay at Viceroy Resort is guaranteed. An itinerary summary has been sent to <strong>{booking.guestEmail}</strong>.
            </p>

            <div className="ref-pill-box">
              CONFIRMATION NO: <strong>{booking.bookingReference}</strong>
            </div>
          </header>

          {/* Main Body */}
          <div className="confirmation-body">
            {/* Suites Card(s) */}
            {Array.isArray(booking.suites) && booking.suites.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                {booking.suites.map((s, idx) => (
                  <div key={idx} className="suite-confirmed-card">
                    <div className="suite-confirmed-img">
                      <img
                        src={s.roomImage || booking.roomImage || "/images/home1.png"}
                        alt={s.roomName}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/home1.png";
                        }}
                      />
                    </div>

                    <div className="suite-confirmed-details">
                      <span className="category">
                        {s.roomCategory || "Ocean View Suite"} · SUITE {s.roomNumber || "101"}
                      </span>
                      <h2>{s.roomName}</h2>
                      <p>
                        Booked: <strong>{s.roomsCount || 1} Room{s.roomsCount > 1 ? "s" : ""}</strong> · Allocated Room Number(s):{" "}
                        <strong style={{ color: "#1f7a3f" }}>
                          {s.allocatedRoomNumbers && s.allocatedRoomNumbers.length > 0
                            ? s.allocatedRoomNumbers.join(", ")
                            : `Room ${s.roomNumber}-1`}
                        </strong>
                      </p>
                      <p style={{ margin: "4px 0 0", color: "#8c6f44", fontSize: "13px" }}>
                        Rate: ₹{s.pricePerNight?.toLocaleString("en-IN")} / room / night
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="suite-confirmed-card">
                <div className="suite-confirmed-img">
                  <img
                    src={booking.roomImage || "/images/home1.png"}
                    alt={booking.roomName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/images/home1.png";
                    }}
                  />
                </div>

                <div className="suite-confirmed-details">
                  <span className="category">
                    {booking.roomCategory || "Ocean View Suite"} · SUITE {booking.roomNumber || "101"}
                  </span>
                  <h2>{booking.roomName}</h2>
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
                <div className="itinerary-label">Check-In</div>
                <div className="itinerary-date">{formatDate(booking.checkIn)}</div>
                <div className="itinerary-time">From 3:00 PM onwards</div>
              </div>

              <div className="itinerary-box">
                <div className="itinerary-label">Check-Out</div>
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
                    <td>₹{booking.pricePerNight?.toLocaleString("en-IN")} / night</td>
                  </tr>
                  <tr>
                    <td>Number of Residences</td>
                    <td>{booking.roomsCount || 1} Suite</td>
                  </tr>
                  <tr>
                    <td>Resort Services, Taxes & Valet</td>
                    <td style={{ color: "#1f7a3f" }}>Included</td>
                  </tr>
                  <tr>
                    <td>Reservation Status</td>
                    <td style={{ color: "#1f7a3f", textTransform: "uppercase" }}>Guaranteed</td>
                  </tr>
                  <tr>
                    <td>Payment Method</td>
                    <td style={{ fontWeight: 600 }}>{booking.paymentMethod || "Razorpay"}</td>
                  </tr>
                  <tr>
                    <td>Payment Status</td>
                    <td style={{ color: booking.paymentStatus === "Paid" ? "#1f7a3f" : "#b25e00", fontWeight: 600, textTransform: "uppercase" }}>
                      {booking.paymentStatus || "Paid"}
                    </td>
                  </tr>
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
                    <td>Total Amount</td>
                    <td>₹{booking.totalPrice?.toLocaleString("en-IN")}</td>
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

            {/* Welcome Perks */}
            <div className="welcome-perks-box">
              <h4>🌿 Included with Your Stay:</h4>
              <ul>
                <li>Personalized in-suite concierge check-in and luggage valet</li>
                <li>Daily complimentary artisan coastal breakfast</li>
                <li>Full access to private oceanfront wellness pool and fitness pavilion</li>
                <li>High-speed fiber optic Wi-Fi throughout all residences</li>
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
