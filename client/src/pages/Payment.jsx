import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  createBookingReservation,
  loadRazorpayScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
  fetchAdminProfile,
} from "../api/adminApi";
import "./Payment.css";

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

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const [y, m, d] = String(dateStr).includes("T")
    ? dateStr.split("T")[0].split("-").map(Number)
    : String(dateStr).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  // Load draft booking state from navigation state or session storage
  const [bookingDraft] = useState(() => {
    if (location.state?.bookingState) {
      try {
        sessionStorage.setItem(
          "viceroy_booking_draft",
          JSON.stringify(location.state.bookingState)
        );
      } catch {}
      return location.state.bookingState;
    }
    try {
      const stored = sessionStorage.getItem("viceroy_booking_draft");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [walletBalance, setWalletBalance] = useState(
    currentUser?.walletBalance || 0
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Editable guest contact fields
  const [guestNameInput, setGuestNameInput] = useState(
    bookingDraft?.guestName || currentUser?.fullName || ""
  );
  const [emailInput, setEmailInput] = useState(
    bookingDraft?.email || currentUser?.email || ""
  );
  const [phoneInput, setPhoneInput] = useState(
    bookingDraft?.phone || currentUser?.phone || ""
  );
  const [isEditingGuest, setIsEditingGuest] = useState(false);

  // Sync latest user profile for up-to-date wallet balance
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchAdminProfile()
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            if (!guestNameInput && user.fullName) setGuestNameInput(user.fullName);
            if (!emailInput && user.email) setEmailInput(user.email);
            if (!phoneInput && user.phone) setPhoneInput(user.phone);
            if (typeof user.walletBalance === "number") {
              setWalletBalance(user.walletBalance);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!bookingDraft || !bookingDraft.checkIn || !bookingDraft.checkOut) {
    return (
      <div className="payment-page">
        <Navbar />
        <main className="payment-container">
          <div className="empty-payment-card">
            <h2>No Active Booking Selection</h2>
            <p>
              It seems you haven't selected your dates or suites yet. Please
              browse our Munnar luxury residences and configure your stay
              details before proceeding to payment.
            </p>
            <Link
              to="/booking"
              className="btn-back-to-booking"
              style={{ background: "#142217", color: "#ffffff", borderColor: "#142217" }}
            >
              ← Select Munnar Suites & Dates
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const {
    checkIn,
    checkOut,
    nights = 1,
    selectedSuitesList = [],
    roomGuests = [],
    totalPrice = 0,
    totalSelectedRooms = 1,
    totalAdults = 2,
    totalChildren = 0,
    totalGuests = 2,
  } = bookingDraft;

  const navigateToConfirmationSuccess = (confirmedBooking) => {
    sessionStorage.removeItem("viceroy_booking_draft");
    sessionStorage.removeItem("viceroy_last_payment_status");
    sessionStorage.removeItem("viceroy_last_payment_error");
    localStorage.setItem("latest_booking", JSON.stringify(confirmedBooking));
    navigate(
      `/booking/confirmation/${confirmedBooking._id || confirmedBooking.bookingReference}`,
      {
        state: {
          status: "success",
          booking: confirmedBooking,
        },
      }
    );
  };

  const handlePaymentFailure = (reason) => {
    setSubmitting(false);
    const failureMsg =
      reason || "Payment authorization was declined by your bank or the transaction was cancelled.";

    // 1. Purge any old successful booking so an old booking never shows as success!
    localStorage.removeItem("latest_booking");
    sessionStorage.setItem("viceroy_last_payment_status", "failed");
    sessionStorage.setItem("viceroy_last_payment_error", failureMsg);

    // 2. FIRST SHOW THE ERROR RIGHT HERE ON THE PAYMENT PAGE AND LET GUEST EDIT!
    setError(failureMsg);
    setIsEditingGuest(true);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Handle Payment & Final Confirmation
  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setError("");

    const currentGuestName = guestNameInput.trim();
    const currentEmail = emailInput.trim().toLowerCase();
    const currentPhone = phoneInput.trim();

    if (!currentGuestName || !currentEmail) {
      setError("Guest contact name and email are required to issue the reservation voucher.");
      setIsEditingGuest(true);
      return;
    }

    if (paymentMethod === "Wallet" && walletBalance < totalPrice) {
      setError(
        `Insufficient Viceroy Guest Wallet balance (Available: ₹${walletBalance.toLocaleString("en-IN")}, Required: ₹${totalPrice.toLocaleString("en-IN")}). Please select Razorpay Gateway or choose Pay at Resort.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const suitesPayload = selectedSuitesList.map(({ suite, roomsCount: sRooms }) => {
        const sPrice = suite.pricePerNight || suite.price || 15000;
        return {
          roomId: suite._id,
          roomName: suite.name,
          roomCategory: suite.category || "Highland Suite",
          roomNumber: suite.roomNumber || "101",
          roomImage: suite.image || "/images/munnar-room-living.jpg",
          pricePerNight: sPrice,
          roomsCount: sRooms,
          subtotal: nights * sPrice * sRooms,
        };
      });

      const primary = selectedSuitesList[0]?.suite || {};
      const primaryPrice = primary.pricePerNight || primary.price || 15000;

      const bookingData = {
        roomId: primary._id || "munnar-suite-101",
        roomName: selectedSuitesList.map((s) => s.suite.name).join(" & "),
        roomCategory: [...new Set(selectedSuitesList.map((s) => s.suite.category))].join(" · "),
        roomNumber: selectedSuitesList.map((s) => s.suite.roomNumber).join(", "),
        roomImage: primary.image || "/images/munnar-room-living.jpg",
        pricePerNight: primaryPrice,
        guestName: currentGuestName,
        guestEmail: currentEmail,
        guestPhone: currentPhone,
        checkIn,
        checkOut,
        guests: totalGuests,
        roomsCount: totalSelectedRooms,
        totalPrice,
        suites: suitesPayload,
        paymentMethod,
        cardLast4: paymentMethod === "Wallet" ? "WALL" : "0000",
        notes: `${totalSelectedRooms} Room(s) in Munnar · ${totalAdults} Adult(s), ${totalChildren} Child(ren)`,
      };

      // 1. RAZORPAY GATEWAY
      if (paymentMethod === "Razorpay") {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          handlePaymentFailure(
            "Razorpay Checkout SDK failed to load. Please verify your internet connection or choose Pay at Resort."
          );
          return;
        }

        const orderData = await createRazorpayOrder({
          amount: totalPrice,
          currency: "INR",
        });

        const razorpayKey =
          orderData.keyId ||
          import.meta.env.VITE_RAZORPAY_KEY_ID ||
          "rzp_test_TyK9he19HuBrTS";

        const options = {
          key: razorpayKey,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: "Viceroy Resort Munnar",
          description: `Highland Sanctuary Stay (${nights} Night${nights > 1 ? "s" : ""} · ${totalSelectedRooms} Room${totalSelectedRooms > 1 ? "s" : ""})`,
          image: "/images/munnar-room-living.jpg",
          order_id: orderData.order.id,
          prefill: {
            name: currentGuestName,
            email: currentEmail,
            contact: currentPhone,
          },
          theme: {
            color: "#142217",
          },
          handler: async function (response) {
            try {
              setSubmitting(true);
              const verifyRes = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingData,
              });

              navigateToConfirmationSuccess(verifyRes.booking);
            } catch (err) {
              handlePaymentFailure(
                err.message || "Payment signature verification failed. Please contact support."
              );
            }
          },
          modal: {
            ondismiss: function () {
              handlePaymentFailure(
                "Payment was cancelled or closed by the user. You can edit your details or try another payment method below."
              );
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response) {
          const errorMsg =
            response.error?.description ||
            response.error?.reason ||
            "Transaction was declined by card network or issuing bank.";
          handlePaymentFailure(errorMsg);
        });
        rzp.open();
        return;
      }

      // 2. WALLET OR PAY AT RESORT
      try {
        const confirmedBooking = await createBookingReservation(bookingData);
        navigateToConfirmationSuccess(confirmedBooking);
      } catch (err) {
        handlePaymentFailure(
          err.message || "Could not complete reservation with the selected payment method."
        );
      }
    } catch (err) {
      handlePaymentFailure(
        err.message || "An unexpected error occurred while processing your reservation."
      );
    }
  };

  // Helper to simulate instant Success or Fail for development & demonstration
  const handleSimulatedTest = async (isSuccess) => {
    setError("");
    const primary = selectedSuitesList[0]?.suite || {};
    const primaryPrice = primary.pricePerNight || primary.price || 15000;
    const suitesPayload = selectedSuitesList.map((item) => ({
      roomId: item.suite._id,
      roomName: item.suite.name,
      roomNumber: item.suite.roomNumber,
      roomCategory: item.suite.category,
      roomImage: item.suite.image,
      roomsCount: item.roomsCount,
      pricePerNight: item.suite.pricePerNight || item.suite.price || 15000,
    }));

    if (isSuccess) {
      setSubmitting(true);
      try {
        const simBookingData = {
          roomId: primary._id || "munnar-suite-101",
          roomName: selectedSuitesList.map((s) => s.suite.name).join(" & "),
          roomCategory: [...new Set(selectedSuitesList.map((s) => s.suite.category))].join(" · "),
          roomNumber: selectedSuitesList.map((s) => s.suite.roomNumber).join(", "),
          roomImage: primary.image || "/images/munnar-room-living.jpg",
          pricePerNight: primaryPrice,
          guestName: guestNameInput.trim() || currentUser?.fullName || "Highland Guest",
          guestEmail: emailInput.trim().toLowerCase() || currentUser?.email || "guest@viceroymunnar.com",
          guestPhone: phoneInput.trim() || currentUser?.phone || "+91 9876543210",
          checkIn,
          checkOut,
          guests: totalGuests,
          roomsCount: totalSelectedRooms,
          totalPrice,
          suites: suitesPayload,
          paymentMethod: paymentMethod === "Wallet" ? "Wallet" : "Razorpay",
          paymentStatus: "paid",
          transactionId: `tx_sim_${Date.now()}`,
          cardLast4: "4242",
          notes: `${totalSelectedRooms} Room(s) in Munnar · Payment Approved`,
        };

        const confirmed = await createBookingReservation(simBookingData);
        navigateToConfirmationSuccess(confirmed);
      } catch (err) {
        setSubmitting(false);
        handlePaymentFailure(err.message || "Failed to create simulated reservation");
      }
    } else {
      // First show the error right here and enable editing!
      handlePaymentFailure(
        "Card declined by issuing bank: Insufficient funds or daily online transaction limit exceeded (Simulated Bank Failure)."
      );
    }
  };

  return (
    <div className="payment-page">
      <Navbar />

      <main className="payment-container">
        {/* Top Back Navigation Bar */}
        <div className="payment-nav-header">
          <Link to="/booking" className="btn-back-to-booking">
            ← Back to Suite Selection
          </Link>
          <span className="payment-step-badge">Step 2 of 2: Payment & Review</span>
        </div>

        {/* Heading */}
        <header className="payment-heading">
          <p className="eyebrow">VICEROY RESORT MUNNAR · SECURE CHECKOUT</p>
          <h1>Review Stay & Complete Payment</h1>
          <p className="subtitle">
            Verify your selected Munnar suites, guest occupancy details, and
            choose your preferred secure payment method below.
          </p>
        </header>

        {/* Stepper Indicator */}
        <nav className="payment-stepper" aria-label="Booking progress">
          <Link to="/booking" className="step-item completed">
            <span className="circle">✓</span>
            <span>1. Suites & Guests</span>
          </Link>
          <div className="step-arrow">→</div>
          <div className="step-item active">
            <span className="circle">2</span>
            <span>2. Payment & Confirmation</span>
          </div>
        </nav>

        {/* Prominent Payment Error & Edit Details Box */}
        {error && (
          <div
            style={{
              maxWidth: "1050px",
              margin: "0 auto 26px",
              padding: "20px 24px",
              background: "#fff5f5",
              border: "2px solid #e53e3e",
              borderRadius: "8px",
              boxShadow: "0 6px 22px rgba(229, 62, 62, 0.14)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
              <span style={{ fontSize: "32px", lineHeight: 1 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "#c53030", fontFamily: "Georgia, serif" }}>
                  Payment Transaction Failed
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#742a2a", fontWeight: "600", lineHeight: "1.5" }}>
                  {error}
                </p>
                <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
                  Your account was not charged. You can <strong>edit your guest information</strong> below, switch to <strong>Viceroy Guest Wallet</strong>, or choose <strong>Pay Upon Arrival at Resort (0 advance)</strong> to guarantee your stay immediately.
                </p>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingGuest(true);
                      const el = document.getElementById("guest-edit-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#142217",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ✏️ Edit Information Below
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("Pay at Resort");
                      setError("");
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#ffffff",
                      color: "#1e5e31",
                      border: "1px solid #1e5e31",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    🏨 Switch to "Pay at Resort" (No Advance)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigate("/booking/confirmation", {
                        state: {
                          status: "failed",
                          failureReason: error,
                          failedPaymentDetails: {
                            totalPrice,
                            paymentMethod,
                            guestName: guestNameInput,
                            email: emailInput,
                            phone: phoneInput,
                            checkIn,
                            checkOut,
                            nights,
                            totalGuests,
                            totalAdults,
                            totalChildren,
                            totalSelectedRooms,
                            selectedSuitesList,
                          },
                          bookingDraft,
                        },
                      });
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#faf8f5",
                      color: "#8c6f44",
                      border: "1px solid #dcd3c4",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    📄 View Failed Confirmation Page →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleProcessPayment}>
          <div className="payment-layout-grid">
            {/* Left Column: Itinerary Details & Payment Methods */}
            <div>
              {/* PANEL 1: RESERVATION ITINERARY */}
              <section className="payment-panel">
                <div className="panel-title">
                  <span>Stay Itinerary Details</span>
                  <small>MUNNAR, KERALA</small>
                </div>

                {/* Dates Row */}
                <div className="checkout-dates-row">
                  <div className="date-item">
                    <small>Check-In Date</small>
                    <strong>{formatDate(checkIn)}</strong>
                  </div>
                  <div className="date-item">
                    <small>Check-Out Date</small>
                    <strong>{formatDate(checkOut)}</strong>
                  </div>
                  <div className="date-item">
                    <small>Duration</small>
                    <strong>{nights} Night{nights > 1 ? "s" : ""}</strong>
                  </div>
                </div>

                {/* Guest Profile Details with In-Place Edit Feature */}
                <div
                  id="guest-edit-section"
                  style={{
                    padding: "16px 20px",
                    background: "#fbf9f4",
                    border: isEditingGuest ? "2px solid #c49d68" : "1px solid #ece5d8",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    transition: "all 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                      borderBottom: "1px dashed #e8dfcf",
                      paddingBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#8c6f44",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      👤 Primary Guest Contact Information
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingGuest(!isEditingGuest)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#142217",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        textDecoration: "underline",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {isEditingGuest ? "✓ Done Editing" : "✏️ Edit Details"}
                    </button>
                  </div>

                  {isEditingGuest ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: "#555",
                            marginBottom: "4px",
                          }}
                        >
                          FULL NAME *
                        </label>
                        <input
                          type="text"
                          required
                          value={guestNameInput}
                          onChange={(e) => setGuestNameInput(e.target.value)}
                          placeholder="e.g. John Doe"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "4px",
                            border: "1px solid #c49d68",
                            fontSize: "13px",
                            background: "#ffffff",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: "#555",
                            marginBottom: "4px",
                          }}
                        >
                          EMAIL ADDRESS (RECEIVES VOUCHER) *
                        </label>
                        <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="e.g. guest@example.com"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "4px",
                            border: "1px solid #c49d68",
                            fontSize: "13px",
                            background: "#ffffff",
                          }}
                        />
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "11px",
                            fontWeight: "bold",
                            color: "#555",
                            marginBottom: "4px",
                          }}
                        >
                          CONTACT PHONE NUMBER
                        </label>
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                            fontSize: "13px",
                            background: "#ffffff",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        fontSize: "13px",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      <div>
                        <span style={{ color: "#8a7c6a", fontWeight: "bold" }}>GUEST: </span>
                        <strong style={{ color: "#142217" }}>{guestNameInput || "Not specified"}</strong> ({emailInput || "No email"})
                      </div>
                      <div>
                        <span style={{ color: "#8a7c6a", fontWeight: "bold" }}>PHONE: </span>
                        <strong style={{ color: "#142217" }}>{phoneInput || "Not provided"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#8a7c6a", fontWeight: "bold" }}>OCCUPANCY: </span>
                        <strong style={{ color: "#142217" }}>{totalGuests} Guests</strong> ({totalAdults} Adults, {totalChildren} Children)
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Suites Cards */}
                <h4 style={{ margin: "0 0 12px", fontSize: "15px", color: "#142217" }}>
                  Selected Munnar Suites ({selectedSuitesList.length})
                </h4>

                {selectedSuitesList.map(({ suite, roomsCount: sRooms }) => (
                  <div key={suite._id} className="checkout-suite-card">
                    <div className="checkout-suite-img">
                      <img
                        src={resolveImgUrl(suite.image)}
                        alt={suite.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/munnar-room-living.jpg";
                        }}
                      />
                    </div>
                    <div className="checkout-suite-info">
                      <h4>{suite.name}</h4>
                      <p>
                        Category: {suite.category || "Highland Suite"} · Suite {suite.roomNumber}
                      </p>
                      <p>
                        Booked: <strong>{sRooms} Room{sRooms > 1 ? "s" : ""}</strong> for {nights} Night{nights > 1 ? "s" : ""}
                      </p>
                      <p className="checkout-suite-price">
                        ₹{(suite.pricePerNight || 15000).toLocaleString("en-IN")} / room / night
                      </p>
                    </div>
                  </div>
                ))}
              </section>

              {/* PANEL 2: PAYMENT METHOD SELECTION */}
              <section className="payment-panel">
                <div className="panel-title">
                  <span>Select Payment Method</span>
                  <small>256-BIT ENCRYPTED</small>
                </div>

                <div className="payment-methods-stack">
                  {/* OPTION 1: RAZORPAY */}
                  <label
                    className={`payment-method-tile ${paymentMethod === "Razorpay" ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Razorpay"
                      checked={paymentMethod === "Razorpay"}
                      onChange={() => setPaymentMethod("Razorpay")}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="tile-title-row">
                        <strong>Razorpay Gateway (UPI, Cards, NetBanking, Wallets)</strong>
                        <span className="badge-recommended">★ RECOMMENDED</span>
                      </div>
                      <p>
                        Instant secure checkout with Google Pay, PhonePe, Paytm, Credit/Debit Cards (Visa, Mastercard, RuPay), and all major Indian net banking accounts.
                      </p>
                    </div>
                  </label>

                  {/* OPTION 2: VICEROY GUEST WALLET */}
                  <label
                    className={`payment-method-tile ${paymentMethod === "Wallet" ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Wallet"
                      checked={paymentMethod === "Wallet"}
                      onChange={() => setPaymentMethod("Wallet")}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="tile-title-row">
                        <strong>Viceroy Guest Wallet Credits</strong>
                        <span style={{ fontFamily: "Arial, sans-serif", fontSize: "12px", color: walletBalance >= totalPrice ? "#1f7a3f" : "#c53030", fontWeight: "bold" }}>
                          Balance: ₹{walletBalance.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p>
                        Deduct directly from your accumulated resort loyalty balance and previous cancellation credits.
                      </p>
                      {paymentMethod === "Wallet" && (
                        <div style={{ marginTop: "8px" }}>
                          {walletBalance >= totalPrice ? (
                            <span style={{ color: "#1f7a3f", fontSize: "13px", fontWeight: "bold" }}>
                              ✓ Sufficient balance available. No additional payment required.
                            </span>
                          ) : (
                            <span style={{ color: "#c53030", fontSize: "13px" }}>
                              ⚠️ Insufficient credits for this reservation. Please choose Razorpay Gateway or Pay Upon Arrival.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* OPTION 3: PAY AT RESORT */}
                  <label
                    className={`payment-method-tile ${paymentMethod === "Pay at Resort" ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Pay at Resort"
                      checked={paymentMethod === "Pay at Resort"}
                      onChange={() => setPaymentMethod("Pay at Resort")}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="tile-title-row">
                        <strong>Pay Upon Arrival at Resort</strong>
                        <span style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#8a7c6a", fontWeight: "bold" }}>
                          0 ADVANCE PAYMENT
                        </span>
                      </div>
                      <p>
                        Guaranteed reservation with front-desk check-in concierge. Pay full amount via Cash, Card, or UPI when you arrive at the resort in Munnar.
                      </p>
                    </div>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Sticky Summary & Checkout Action */}
            <div className="payment-sidebar">
              <div className="order-summary-card">
                <h3>Order Summary</h3>

                <table className="order-summary-table">
                  <tbody>
                    <tr>
                      <td>Stay Duration</td>
                      <td>{nights} Night{nights > 1 ? "s" : ""}</td>
                    </tr>
                    <tr>
                      <td>Total Rooms Booked</td>
                      <td>{totalSelectedRooms} Room{totalSelectedRooms > 1 ? "s" : ""}</td>
                    </tr>
                    <tr>
                      <td>Total Guests</td>
                      <td>{totalGuests} ({totalAdults}A, {totalChildren}C)</td>
                    </tr>
                    <tr>
                      <td>Room Charges Subtotal</td>
                      <td>₹{totalPrice.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Tea Estate Breakfast & Wi-Fi</td>
                      <td style={{ color: "#1f7a3f" }}>Included (FREE)</td>
                    </tr>
                    <tr>
                      <td>Highland Concierge Valet</td>
                      <td style={{ color: "#1f7a3f" }}>Included (FREE)</td>
                    </tr>
                    <tr className="total-row">
                      <td>Total Due</td>
                      <td>₹{totalPrice.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>

                <button
                  type="submit"
                  className="btn-checkout-confirm"
                  disabled={submitting || (paymentMethod === "Wallet" && walletBalance < totalPrice)}
                >
                  {submitting
                    ? paymentMethod === "Razorpay"
                      ? "Connecting to Razorpay..."
                      : paymentMethod === "Wallet"
                      ? "Processing Wallet Deduction..."
                      : "Confirming Reservation..."
                    : paymentMethod === "Razorpay"
                    ? `Proceed to Razorpay (₹${totalPrice.toLocaleString("en-IN")})`
                    : paymentMethod === "Wallet"
                    ? `Pay with Wallet (₹${totalPrice.toLocaleString("en-IN")})`
                    : `Reserve & Pay at Resort (₹${totalPrice.toLocaleString("en-IN")})`}
                </button>

                <div className="security-notice-list">
                  <span>🔒 256-Bit Bank-Grade Encryption</span>
                  <span>⚡ Instant SMS & Email Confirmation Voucher</span>
                  <span>🛡️ Official Razorpay Verified Merchant</span>
                  <span>📍 Viceroy Resort Munnar, Kerala 685612</span>
                </div>

                {/* Instant Simulator Actions for Testing Success or Fail */}
                <div
                  style={{
                    marginTop: "20px",
                    padding: "14px 16px",
                    background: "#fbf9f4",
                    border: "1px dashed #dcd3c4",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "1px",
                      color: "#8c6f44",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    🧪 Payment Outcome Test Simulator
                  </span>
                  <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#666" }}>
                    Quickly test both outcomes directly:
                  </p>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSimulatedTest(true)}
                      style={{
                        padding: "8px 14px",
                        background: "#eaf6ee",
                        border: "1px solid #7bc691",
                        borderRadius: "6px",
                        color: "#1f7a3f",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                      }}
                      title="Test the Payment Successful Confirmation Page"
                    >
                      ✓ Test Success Page
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleSimulatedTest(false)}
                      style={{
                        padding: "8px 14px",
                        background: "#fdf0f0",
                        border: "1px solid #f5c6cb",
                        borderRadius: "6px",
                        color: "#a82e2e",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                      }}
                      title="Test the Payment Failed Error & Edit"
                    >
                      ✕ Test Failed (Show Error & Edit)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default Payment;
