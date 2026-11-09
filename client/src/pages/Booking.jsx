import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  createBookingReservation,
  checkDateRangeAvailability,
  fetchRooms,
  fetchAdminProfile,
  fetchMyBookings,
  loadRazorpayScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../api/adminApi";
import "./Booking.css";

// Helper utilities for date arithmetic and min date restrictions
const formatToDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayString = () => formatToDateInput(new Date());

const getTomorrowString = (fromDateStr) => {
  const base = fromDateStr ? new Date(fromDateStr + "T00:00:00") : new Date();
  base.setDate(base.getDate() + 1);
  return formatToDateInput(base);
};

const getDaysDifference = (checkInStr, checkOutStr) => {
  if (!checkInStr || !checkOutStr) return 1;
  const [y1, m1, d1] = checkInStr.split("-").map(Number);
  const [y2, m2, d2] = checkOutStr.split("-").map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

// Default luxury suites (Each suite with 4 rooms in different locations)
const defaultSuites = [
  {
    _id: "default-1",
    roomNumber: "101",
    name: "Travertine Ocean Horizon Pavilion",
    location: "Maldives Horizon Coast",
    totalRooms: 4,
    freeRoomsCount: 4,
    bookedRoomsCount: 0,
    roomNumbers: ["101-1", "101-2", "101-3", "101-4"],
    availableRoomNumbers: ["101-1", "101-2", "101-3", "101-4"],
    bookedRoomNumbers: [],
    category: "Ocean View Suite",
    pricePerNight: 15000,
    image: "/images/viceroy-bedroom.jpg",
    status: "available",
    description: "Panoramic oceanfront suite in Maldives featuring 4 private rooms, soaking terrace & daybed",
  },
  {
    _id: "default-2",
    roomNumber: "102",
    name: "Private Garden Sanctuary",
    location: "Bali Tropical Botanical Valley",
    totalRooms: 4,
    freeRoomsCount: 4,
    bookedRoomsCount: 0,
    roomNumbers: ["102-1", "102-2", "102-3", "102-4"],
    availableRoomNumbers: ["102-1", "102-2", "102-3", "102-4"],
    bookedRoomNumbers: [],
    category: "Luxury Suite",
    pricePerNight: 10000,
    image: "/images/viceroy-bath.jpg",
    status: "available",
    description: "Restorative wellness sanctuary in Bali featuring 4 rooms immersed in lush botanical flora",
  },
  {
    _id: "default-3",
    roomNumber: "103",
    name: "Architectural Coastal Villa",
    location: "Phuket Azure Peninsula",
    totalRooms: 4,
    freeRoomsCount: 4,
    bookedRoomsCount: 0,
    roomNumbers: ["103-1", "103-2", "103-3", "103-4"],
    availableRoomNumbers: ["103-1", "103-2", "103-3", "103-4"],
    bookedRoomNumbers: [],
    category: "Royal Beach Villa",
    pricePerNight: 25000,
    image: "/images/viceroy-villa.jpg",
    status: "available",
    description: "Multi-level private estate in Phuket featuring 4 king suites, infinity plunge pool & personal butler",
  },
];

function Booking() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUser = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const todayStr = getTodayString();
  const tomorrowStr = getTomorrowString(todayStr);

  // Multi-page step flow: Step 1 (Details & Multi-Suite Selection) vs Step 2 (Payment & Review)
  const currentStep = searchParams.get("step") === "2" ? 2 : 1;
  const goToStep = (step) => {
    if (step === 2) {
      setSearchParams({ step: "2" });
    } else {
      setSearchParams({});
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dates
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);

  // Suites & Availability Inventory
  const [availableSuites, setAvailableSuites] = useState(defaultSuites);
  const [suiteFilter, setSuiteFilter] = useState("all"); // 'all' | 'available' | 'booked'

  // Multi-Suite Selection Map: { [suiteId]: { suite, roomsCount } }
  // User can select and book DIFFERENT suites at the same time!
  const [selectedSuitesMap, setSelectedSuitesMap] = useState({});

  // Room guests configuration: Each room enforces max 4 guests (4 adults max or 1 adult + 3 children)
  const [roomGuests, setRoomGuests] = useState([{ adults: 2, children: 0 }]);

  // User's active reservations
  const [, setMyBookings] = useState([]);

  // Guest Contact Information
  const [guestName, setGuestName] = useState(currentUser?.fullName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [cardHolder, setCardHolder] = useState(currentUser?.fullName || "Guest Resident");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [upiId] = useState("viceroyresort@okhdfcbank");

  // Processing state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [availabilityNotice, setAvailabilityNotice] = useState(null);

  // Helper to determine suite availability stats
  const getSuiteInfo = (suite) => {
    const total = Number(suite.totalRooms) || 4;
    const booked = Number(suite.bookedRoomsCount) || 0;
    const free =
      suite.freeRoomsCount !== undefined
        ? Number(suite.freeRoomsCount)
        : Math.max(0, total - booked);
    const isMaintenance = suite.status === "maintenance";
    const isAvailable = free > 0 && !isMaintenance;
    const isFullyBooked = free === 0 || suite.status === "booked";

    return {
      total,
      booked,
      free,
      isAvailable,
      isFullyBooked,
      isMaintenance,
      availableRoomNumbers: suite.availableRoomNumbers || [],
      bookedRoomNumbers: suite.bookedRoomNumbers || [],
      allRoomNumbers: suite.roomNumbers || [],
    };
  };

  // Helper: check if suite is available for booking
  const isRoomAvailable = (suite) => {
    if (!suite) return false;
    const { isAvailable } = getSuiteInfo(suite);
    return isAvailable;
  };

  // Sync profile details and existing user reservations
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchAdminProfile()
        .then((user) => {
          if (user) {
            if (!guestName && user.fullName) setGuestName(user.fullName);
            if (!email && user.email) setEmail(user.email);
            if (!phone && user.phone) setPhone(user.phone);
          }
        })
        .catch(() => {});

      fetchMyBookings()
        .then((bookings) => {
          if (Array.isArray(bookings) && bookings.length > 0) {
            setMyBookings(bookings);
          }
        })
        .catch(() => {});
    }

    // Load dynamic rooms from database
    fetchRooms()
      .then((data) => {
        const roomsList = Array.isArray(data) ? data : data?.rooms || [];
        if (roomsList.length > 0) {
          setAvailableSuites(roomsList);
          // Pre-select first available suite with 1 room
          const firstAvail = roomsList.find(isRoomAvailable);
          if (firstAvail) {
            setSelectedSuitesMap({
              [firstAvail._id]: {
                suite: firstAvail,
                roomsCount: 1,
              },
            });
          }
        }
      })
      .catch(() => {
        // Fallback to default suites
        const firstAvail = defaultSuites.find(isRoomAvailable);
        if (firstAvail) {
          setSelectedSuitesMap({
            [firstAvail._id]: {
              suite: firstAvail,
              roomsCount: 1,
            },
          });
        }
      });
  }, []);

  // Check date range availability whenever dates change
  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      checkDateRangeAvailability(checkIn, checkOut)
        .then((res) => {
          setAvailabilityNotice({
            availableCount: res.availableCount,
            totalRooms: res.totalRooms,
          });
          if (res.rooms && res.rooms.length > 0) {
            setAvailableSuites(res.rooms);

            // Update selected suites map to clamp roomsCount to new freeRoomsCount
            setSelectedSuitesMap((prev) => {
              const next = {};
              for (const [id, item] of Object.entries(prev)) {
                const refreshedSuite = res.rooms.find((r) => r._id === id);
                if (refreshedSuite) {
                  const { free, isAvailable } = getSuiteInfo(refreshedSuite);
                  if (isAvailable && free > 0) {
                    next[id] = {
                      suite: refreshedSuite,
                      roomsCount: Math.min(item.roomsCount, free),
                    };
                  }
                }
              }
              // If none selected after refresh, select first available
              if (Object.keys(next).length === 0) {
                const firstAvail = res.rooms.find(isRoomAvailable);
                if (firstAvail) {
                  next[firstAvail._id] = {
                    suite: firstAvail,
                    roomsCount: 1,
                  };
                }
              }
              return next;
            });
          }
        })
        .catch(() => {
          setAvailabilityNotice(null);
        });
    } else {
      setAvailabilityNotice(null);
    }
  }, [checkIn, checkOut]);

  // Selected Suites Array & Total Computations
  const selectedSuitesList = Object.values(selectedSuitesMap);
  const totalSelectedRooms = selectedSuitesList.reduce(
    (sum, s) => sum + s.roomsCount,
    0
  );

  // Sync roomGuests count with totalSelectedRooms
  useEffect(() => {
    const targetCount = Math.max(1, totalSelectedRooms);
    setRoomGuests((prev) => {
      const updated = [...prev];
      if (targetCount > updated.length) {
        for (let i = updated.length; i < targetCount; i++) {
          updated.push({ adults: 2, children: 0 });
        }
      } else if (targetCount < updated.length) {
        return updated.slice(0, targetCount);
      }
      return updated;
    });
  }, [totalSelectedRooms]);

  // Handle adults change for a specific room (min 1 adult, max 4 adults)
  const handleAdultsChange = (roomIndex, newAdults) => {
    const adults = Math.max(1, Math.min(4, Number(newAdults)));
    setRoomGuests((prev) => {
      const updated = [...prev];
      const maxChildren = 4 - adults;
      const currentChildren = updated[roomIndex]?.children || 0;
      const children = Math.min(currentChildren, maxChildren);
      updated[roomIndex] = { adults, children };
      return updated;
    });
  };

  // Handle children change for a specific room (min 0, max 3, adults + children <= 4)
  const handleChildrenChange = (roomIndex, newChildren) => {
    const children = Math.max(0, Number(newChildren));
    setRoomGuests((prev) => {
      const updated = [...prev];
      const adults = updated[roomIndex]?.adults || 1;
      const validChildren = Math.min(children, 4 - adults);
      updated[roomIndex] = { adults, children: validChildren };
      return updated;
    });
  };

  // Total guest calculations
  const totalAdults = roomGuests.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = roomGuests.reduce((sum, r) => sum + r.children, 0);
  const totalGuests = totalAdults + totalChildren;

  // Calculate nights safely
  const nights = getDaysDifference(checkIn, checkOut);

  // Price calculations across all selected suites
  const totalPerNightRate = selectedSuitesList.reduce((sum, s) => {
    const price = s.suite.pricePerNight || s.suite.price || 15000;
    return sum + price * s.roomsCount;
  }, 0);

  const totalPrice = nights * totalPerNightRate;

  // Handle Check-in date change
  const handleCheckInChange = (e) => {
    const newCheckIn = e.target.value;
    setCheckIn(newCheckIn);
    if (!checkOut || checkOut <= newCheckIn) {
      setCheckOut(getTomorrowString(newCheckIn));
    }
  };

  // Suite Toggle Selection (User can select multiple different suites at a time!)
  const handleToggleSuite = (suite) => {
    const { isAvailable, free } = getSuiteInfo(suite);
    if (!isAvailable || free <= 0) {
      setError(
        `Suite "${suite.name}" is currently fully booked. Please select available suites.`
      );
      return;
    }

    setError("");
    setSelectedSuitesMap((prev) => {
      const next = { ...prev };
      if (next[suite._id]) {
        // If it's the only selected suite, prevent deselecting completely
        if (Object.keys(next).length === 1) {
          return next;
        }
        delete next[suite._id];
      } else {
        next[suite._id] = {
          suite,
          roomsCount: 1,
        };
      }
      return next;
    });
  };

  // Handle room count change for a specific suite
  const handleSuiteRoomsCountChange = (suiteId, count) => {
    const num = Math.max(1, Number(count));
    setSelectedSuitesMap((prev) => {
      if (!prev[suiteId]) return prev;
      return {
        ...prev,
        [suiteId]: {
          ...prev[suiteId],
          roomsCount: num,
        },
      };
    });
  };

  // Availability counters
  const totalAvailableSuites = availableSuites.filter(isRoomAvailable).length;
  const totalBookedSuites = availableSuites.length - totalAvailableSuites;

  // Filtered suites by active tab
  const displayedSuites = availableSuites.filter((suite) => {
    if (suiteFilter === "available") return isRoomAvailable(suite);
    if (suiteFilter === "booked") return !isRoomAvailable(suite);
    return true;
  });

  // Build room-to-suite mapping for clear guest assignment
  const roomSuiteAssignments = [];
  selectedSuitesList.forEach((item) => {
    for (let i = 0; i < item.roomsCount; i++) {
      roomSuiteAssignments.push({
        suite: item.suite,
        suiteRoomIndex: i + 1,
      });
    }
  });

  // Validate Step 1 and proceed to Page 2 (Payment & Itinerary Review)
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    setError("");

    if (!checkIn || !checkOut || nights <= 0) {
      setError("Please select valid check-in and check-out dates.");
      window.scrollTo({ top: 150, behavior: "smooth" });
      return;
    }

    if (selectedSuitesList.length === 0) {
      setError("Please select at least one available suite to proceed.");
      window.scrollTo({ top: 400, behavior: "smooth" });
      return;
    }

    if (!guestName.trim()) {
      setError("Please enter your full name.");
      window.scrollTo({ top: 500, behavior: "smooth" });
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address so we can send your confirmation.");
      window.scrollTo({ top: 500, behavior: "smooth" });
      return;
    }

    goToStep(2);
  };

  // Handle Final Booking Submission on Page 2
  async function handleBooking(event) {
    event.preventDefault();
    setError("");

    if (!checkIn || !checkOut || nights <= 0) {
      setError("Please select valid check-in and check-out dates.");
      goToStep(1);
      return;
    }

    if (selectedSuitesList.length === 0) {
      setError("Please select at least one suite.");
      goToStep(1);
      return;
    }

    if (!guestName.trim() || !email.trim()) {
      setError("Please complete your guest name and email address.");
      goToStep(1);
      return;
    }

    setSubmitting(true);

    try {
      const roomBreakdownNote = roomGuests
        .map((r, i) => {
          const assign = roomSuiteAssignments[i];
          const suiteLabel = assign ? ` (${assign.suite.name})` : "";
          return `Room ${i + 1}${suiteLabel}: ${r.adults} Adult(s), ${r.children} Child(ren)`;
        })
        .join("; ");

      // Prepare multi-suite payload
      const suitesPayload = selectedSuitesList.map(({ suite, roomsCount: sRooms }) => {
        const sPrice = suite.pricePerNight || suite.price || 15000;
        return {
          roomId: suite._id?.startsWith("default") ? undefined : suite._id,
          roomName: suite.name,
          roomCategory: suite.category || "Ocean View Suite",
          roomNumber: suite.roomNumber || "101",
          roomImage: suite.image || "/images/home1.png",
          pricePerNight: sPrice,
          roomsCount: sRooms,
          subtotal: nights * sPrice * sRooms,
        };
      });

      const primary = selectedSuitesList[0].suite;
      const primaryPrice = primary.pricePerNight || primary.price || 15000;

      const bookingData = {
        roomId: primary._id?.startsWith("default") ? undefined : primary._id,
        roomName: selectedSuitesList.map((s) => s.suite.name).join(" & "),
        roomCategory: [...new Set(selectedSuitesList.map((s) => s.suite.category))].join(" · "),
        roomNumber: selectedSuitesList.map((s) => s.suite.roomNumber).join(", "),
        roomImage: primary.image || "/images/home1.png",
        pricePerNight: primaryPrice,
        guestName: guestName.trim(),
        guestEmail: email.trim().toLowerCase(),
        guestPhone: phone.trim(),
        checkIn,
        checkOut,
        guests: totalGuests,
        roomsCount: totalSelectedRooms,
        totalPrice,
        suites: suitesPayload,
        paymentMethod,
        cardLast4: paymentMethod === "Credit/Debit Card" ? "4242" : "0000",
        notes: `${totalSelectedRooms} Room(s) across ${selectedSuitesList.length} Suite(s) · ${totalAdults} Adult(s), ${totalChildren} Child(ren) (${roomBreakdownNote})`,
      };

      // 1. RAZORPAY GATEWAY CHECKOUT FLOW
      if (paymentMethod === "Razorpay") {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Razorpay Checkout SDK failed to load. Please verify your internet connection.");
        }

        const orderData = await createRazorpayOrder({
          amount: totalPrice,
          currency: "INR",
          receipt: `rcpt_${Date.now().toString().slice(-8)}`,
          notes: {
            guestName: guestName.trim(),
            guestEmail: email.trim().toLowerCase(),
            suites: selectedSuitesList.map((s) => s.suite.name).join(", "),
          },
        });

        // Handle simulated environment if Razorpay popup is not available
        if (orderData.isSimulated && (!window.Razorpay || typeof window.Razorpay !== "function")) {
          const verifyRes = await verifyRazorpayPayment({
            razorpay_order_id: orderData.order.id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: "simulated_signature",
            bookingData,
          });
          const confirmedBooking = verifyRes.booking || bookingData;
          localStorage.setItem("latest_booking", JSON.stringify(confirmedBooking));
          navigate("/booking/confirmation", { state: { booking: confirmedBooking } });
          return;
        }

        const options = {
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: "Viceroy Resort",
          description: `Luxury Stay: ${totalSelectedRooms} Room(s) · ${nights} Night(s)`,
          image: "/images/home1.png",
          order_id: orderData.order.id,
          prefill: {
            name: guestName.trim(),
            email: email.trim().toLowerCase(),
            contact: phone.trim(),
          },
          notes: {
            guestName: guestName.trim(),
            guestEmail: email.trim().toLowerCase(),
            suites: selectedSuitesList.map((s) => s.suite.name).join(", "),
          },
          theme: {
            color: "#142217",
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
            },
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

              const confirmedBooking = verifyRes.booking || bookingData;
              localStorage.setItem("latest_booking", JSON.stringify(confirmedBooking));
              navigate("/booking/confirmation", { state: { booking: confirmedBooking } });
            } catch (verifyErr) {
              setError(verifyErr.message || "Payment verification failed. Please try again.");
              setSubmitting(false);
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (failResponse) {
          setError(`Razorpay payment failed: ${failResponse.error?.description || "Transaction declined"}`);
          setSubmitting(false);
        });
        rzp.open();
        return;
      }

      // 2. DIRECT OR ALTERNATIVE PAYMENT (Pay at Resort / Demo Card)
      const booking = await createBookingReservation(bookingData);

      localStorage.setItem("latest_booking", JSON.stringify(booking));
      navigate("/booking/confirmation", { state: { booking } });
    } catch (err) {
      setError(err.message || "Failed to finalize reservation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const minCheckOutDate = getTomorrowString(checkIn);

  // Administrator Restriction: Admins cannot make reservations
  if (currentUser?.role === "admin") {
    return (
      <>
        <Navbar />
        <main
          className="booking-page"
          style={{
            minHeight: "75vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
          }}
        >
          <div
            style={{
              maxWidth: "540px",
              width: "100%",
              background: "#ffffff",
              border: "1px solid #e0d7c7",
              borderRadius: "10px",
              padding: "44px 32px",
              textAlign: "center",
              boxShadow: "0 10px 30px rgba(20, 34, 23, 0.08)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                background: "#f4eee3",
                color: "#795d37",
                border: "1px solid #e5d5be",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              ADMINISTRATOR ACCOUNT
            </div>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "26px",
                color: "#142217",
                margin: "0 0 12px",
              }}
            >
              Booking Restricted
            </h2>
            <p
              style={{
                color: "#6e6b66",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "0 0 28px",
              }}
            >
              Administrators cannot make residence bookings. Room bookings are
              reserved for resort guests only. To manage rooms, check-ins, and
              guest reservations, please use the Admin Dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin")}
              style={{
                padding: "12px 24px",
                background: "#142217",
                color: "#c49d68",
                border: "1px solid #c49d68",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              Go to Admin Dashboard →
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="booking-page">
        {/* Header Title */}
        <header className="booking-heading">
          <p>VICEROY RESORT · RESERVATIONS</p>
          <h1>
            {currentStep === 1
              ? "Curate Your Sanctuary Itinerary"
              : "Review Stay & Secure Checkout"}
          </h1>
          <p>
            {currentStep === 1
              ? "Select your dates, book different suites at the same time, choose the number of rooms for each suite, configure guest occupancy, and enter your details."
              : "Verify your stay itinerary across your selected suites, review the total amount, and choose your preferred payment method."}
          </p>
        </header>

        {/* Step Indicator Navigation */}
        <nav className="booking-stepper" aria-label="Booking steps">
          <div
            className={`stepper-step ${currentStep === 1 ? "active" : "completed"}`}
            onClick={() => goToStep(1)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && goToStep(1)}
          >
            <div className="step-number">{currentStep === 2 ? "✓" : "1"}</div>
            <div className="step-text">
              <span className="step-title">1. Suites & Guest Details</span>
              <span className="step-subtitle">
                {currentStep === 1 ? "In Progress" : "Completed · Click to edit"}
              </span>
            </div>
          </div>

          <div className="stepper-divider" />

          <div
            className={`stepper-step ${currentStep === 2 ? "active" : "upcoming"}`}
            onClick={() => {
              if (guestName.trim() && email.trim() && selectedSuitesList.length > 0) {
                goToStep(2);
              }
            }}
            role="button"
            tabIndex={guestName.trim() && email.trim() ? 0 : -1}
          >
            <div className="step-number">2</div>
            <div className="step-text">
              <span className="step-title">2. Payment & Confirmation</span>
              <span className="step-subtitle">
                {currentStep === 2 ? "Active Step" : "Payment & Stay Summary"}
              </span>
            </div>
          </div>
        </nav>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              maxWidth: "850px",
              margin: "0 auto 24px",
              padding: "14px 20px",
              background: "#fdf0f0",
              border: "1px solid #f5c6cb",
              borderRadius: "6px",
              color: "#a82e2e",
              fontSize: "14px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ======================================================== */}
        {/* PAGE 1: DATES, SUITES (MULTI-SELECT), OCCUPANCY, GUESTS  */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <form onSubmit={handleProceedToPayment}>
            {/* STEP 01: DATES */}
            <section className="booking-section">
              <p className="step-label">STEP 01</p>
              <h2>Select Stay Dates</h2>

              <div className="booking-fields" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <label>
                  CHECK-IN (TODAY ONWARDS ONLY)
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={checkIn}
                    onChange={handleCheckInChange}
                  />
                </label>

                <label>
                  CHECK-OUT
                  <input
                    type="date"
                    required
                    min={minCheckOutDate}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </label>
              </div>

              {availabilityNotice && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "13px",
                    color: "#1f7a3f",
                    fontWeight: "600",
                    background: "#eaf6ee",
                    padding: "8px 14px",
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  ✓ Date Range Availability: {availabilityNotice.availableCount} of{" "}
                  {availabilityNotice.totalRooms} suites open for {nights} night(s).
                </div>
              )}
            </section>

            {/* STEP 02: SUITES SELECTION & AVAILABILITY BREAKDOWN (MULTI-SUITE SELECTION) */}
            <section className="booking-section">
              <div className="suite-section-top-row">
                <div>
                  <p className="step-label">STEP 02</p>
                  <h2>Select Resort Suites & Number of Rooms</h2>
                  <p style={{ margin: "4px 0 0", color: "#6e6b66", fontSize: "14px" }}>
                    <strong>Multi-Suite Booking:</strong> You can select and book different suites at the same time. If some rooms in a suite are booked by another user, you can book any of the remaining available rooms!
                  </p>
                </div>

                {/* Availability Summary Counter */}
                <div className="suite-avail-counter-badge" style={{ marginTop: "10px" }}>
                  <span className="counter-pill avail">
                    🟢 {totalAvailableSuites} Suites Available
                  </span>
                  <span className="counter-pill booked">
                    🔴 {totalBookedSuites} Fully Booked
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="suite-filter-bar" style={{ marginTop: "18px" }}>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "all" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("all")}
                >
                  All Suites ({availableSuites.length})
                </button>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "available" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("available")}
                >
                  🟢 Available Only ({totalAvailableSuites})
                </button>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "booked" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("booked")}
                >
                  🔴 Fully Booked ({totalBookedSuites})
                </button>
              </div>

              {/* Suite Cards List with Checkbox Multi-selection & Rooms count per suite */}
              <div className="suite-category-grid">
                {displayedSuites.map((suite) => {
                  const sPrice = suite.pricePerNight || suite.price || 15000;
                  const {
                    total,
                    booked,
                    free,
                    isAvailable,
                    isFullyBooked,
                    availableRoomNumbers,
                    bookedRoomNumbers,
                  } = getSuiteInfo(suite);

                  const isSelected = !!selectedSuitesMap[suite._id];
                  const currentSelectedRooms = selectedSuitesMap[suite._id]?.roomsCount || 1;

                  const suiteImage =
                    suite.image ||
                    (suite.roomNumber === "102"
                      ? "/images/viceroy-bath.jpg"
                      : suite.roomNumber === "103"
                      ? "/images/viceroy-villa.jpg"
                      : "/images/viceroy-bedroom.jpg");

                  return (
                    <div
                      key={suite._id}
                      className={`suite-card-option ${
                        isSelected ? "selected" : ""
                      } ${!isAvailable ? "is-booked-card" : "is-available-card"}`}
                      style={{
                        cursor: isAvailable ? "pointer" : "not-allowed",
                        border: isSelected ? "2px solid #c49d68" : undefined,
                        background: isSelected ? "#fffdf8" : undefined,
                      }}
                      onClick={() => {
                        if (isAvailable) {
                          handleToggleSuite(suite);
                        }
                      }}
                    >
                      {/* Suite Image Thumbnail */}
                      <div className="suite-image-wrapper">
                        <img
                          src={suiteImage}
                          alt={suite.name}
                          className="suite-thumbnail-img"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/images/home1.png";
                          }}
                        />
                        <span className="suite-category-badge">
                          {suite.category || "Luxury Suite"}
                        </span>

                        {!isAvailable && (
                          <div className="image-booked-ribbon">
                            <span>FULLY BOOKED</span>
                          </div>
                        )}
                      </div>

                      {/* Suite Details */}
                      <div className="suite-details-wrapper" onClick={(e) => e.stopPropagation()}>
                        <div className="suite-header-row">
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                flexWrap: "wrap",
                              }}
                            >
                              <h3 className="suite-card-title">{suite.name}</h3>

                              {/* Availability Status Badge */}
                              {isAvailable ? (
                                <span className="room-status-badge available">
                                  ● {free} of {total} Rooms Available
                                  {booked > 0 ? ` (${booked} Booked)` : ""}
                                </span>
                              ) : (
                                <span className="room-status-badge booked">
                                  ● Fully Booked (0 / {total} Free)
                                </span>
                              )}
                            </div>

                            {/* Suite Specs & Room Numbers */}
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                alignItems: "center",
                                marginTop: "6px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span className="suite-room-num">
                                Suite {suite.roomNumber || "101"}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#8c6f44",
                                  fontWeight: "600",
                                }}
                              >
                                📍 {suite.location || "Coastal Sanctuary"}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: "#f4eee2",
                                  color: "#142217",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontWeight: "bold",
                                }}
                              >
                                🚪 Total: {total} Rooms in Suite
                              </span>
                            </div>

                            {/* Detailed Room Availability Numbers Display */}
                            <div
                              style={{
                                marginTop: "8px",
                                fontSize: "12px",
                                display: "flex",
                                gap: "12px",
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              {free > 0 && (
                                <div style={{ color: "#1f7a3f" }}>
                                  <strong>🟢 Available Rooms ({free}):</strong>{" "}
                                  {availableRoomNumbers.length > 0
                                    ? availableRoomNumbers.join(", ")
                                    : `${free} free room(s)`}
                                </div>
                              )}
                              {booked > 0 && (
                                <div style={{ color: "#c95d32" }}>
                                  <strong>🔴 Booked Rooms ({booked}):</strong>{" "}
                                  {bookedRoomNumbers.length > 0
                                    ? bookedRoomNumbers.join(", ")
                                    : `${booked} booked room(s)`}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Multi-Suite Selection Checkbox Indicator */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "6px",
                            }}
                          >
                            <button
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => handleToggleSuite(suite)}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                cursor: isAvailable ? "pointer" : "not-allowed",
                                border: isSelected ? "2px solid #142217" : "1px solid #c49d68",
                                background: isSelected
                                  ? "#142217"
                                  : isAvailable
                                  ? "#ffffff"
                                  : "#f2ece4",
                                color: isSelected
                                  ? "#c49d68"
                                  : isAvailable
                                  ? "#142217"
                                  : "#888",
                                transition: "all 0.2s",
                              }}
                            >
                              {isSelected
                                ? "✓ SELECTED FOR STAY"
                                : isAvailable
                                ? "+ SELECT THIS SUITE"
                                : "🔒 FULLY BOOKED"}
                            </button>
                          </div>
                        </div>

                        <p className="suite-card-desc">
                          {suite.description ||
                            "Oceanfront luxury sanctuary curated with natural stone, private balcony, and personalized care."}
                        </p>

                        {/* If this suite is selected: Show Room Count Selector for this Suite */}
                        {isSelected && isAvailable && (
                          <div
                            style={{
                              marginTop: "12px",
                              padding: "12px 16px",
                              background: "#f7f4ee",
                              border: "1px solid #e2dacd",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "12px",
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  color: "#142217",
                                  display: "block",
                                }}
                              >
                                How many rooms do you want to book in Suite {suite.roomNumber}?
                              </span>
                              <span style={{ fontSize: "11px", color: "#666" }}>
                                (Max {free} room{free > 1 ? "s" : ""} available for selected dates)
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <label
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  color: "#142217",
                                  letterSpacing: "1px",
                                }}
                              >
                                ROOMS:
                              </label>
                              <select
                                value={currentSelectedRooms}
                                onChange={(e) =>
                                  handleSuiteRoomsCountChange(suite._id, e.target.value)
                                }
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                  border: "1px solid #c49d68",
                                  background: "#ffffff",
                                  fontSize: "13px",
                                  fontWeight: "bold",
                                  color: "#142217",
                                  cursor: "pointer",
                                }}
                              >
                                {Array.from({ length: free }, (_, idx) => idx + 1).map((n) => (
                                  <option key={n} value={n}>
                                    {n} Room{n > 1 ? "s" : ""}
                                  </option>
                                ))}
                              </select>

                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "bold",
                                  color: "#142217",
                                  marginLeft: "8px",
                                }}
                              >
                                = ₹{(sPrice * currentSelectedRooms).toLocaleString("en-IN")} / night
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Price footer */}
                        <div className="suite-footer-row" style={{ marginTop: "14px" }}>
                          <span className="suite-card-price">
                            ₹{sPrice.toLocaleString("en-IN")}{" "}
                            <small>/ room / night</small>
                          </span>

                          {isAvailable && isSelected && (
                            <span className="suite-chosen-pill">
                              ✓ {currentSelectedRooms} Room{currentSelectedRooms > 1 ? "s" : ""} Selected
                            </span>
                          )}

                          {isAvailable && !isSelected && (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#2b7a42",
                                fontWeight: "600",
                              }}
                            >
                              ✓ {free} room{free > 1 ? "s" : ""} ready to book
                            </span>
                          )}

                          {isFullyBooked && (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#a82e2e",
                                fontWeight: "600",
                              }}
                            >
                              All {total} rooms occupied for these dates
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Suites Multi-Cart Banner */}
              {selectedSuitesList.length > 0 && (
                <div
                  style={{
                    marginTop: "24px",
                    padding: "18px 22px",
                    background: "#142217",
                    color: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid #c49d68",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          color: "#c49d68",
                          fontSize: "11px",
                          letterSpacing: "1px",
                          textTransform: "uppercase",
                          fontWeight: "bold",
                        }}
                      >
                        Active Selection ({selectedSuitesList.length} Suite
                        {selectedSuitesList.length > 1 ? "s" : ""}, {totalSelectedRooms} Room
                        {totalSelectedRooms > 1 ? "s" : ""} total)
                      </span>
                      <div style={{ marginTop: "6px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {selectedSuitesList.map(({ suite, roomsCount: sRooms }) => (
                          <span
                            key={suite._id}
                            style={{
                              background: "rgba(255, 255, 255, 0.12)",
                              border: "1px solid rgba(196, 157, 104, 0.4)",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "13px",
                            }}
                          >
                            🏛️ <strong>{suite.name}</strong> ({sRooms} Room{sRooms > 1 ? "s" : ""})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "12px", color: "#e0d7c7" }}>
                        Combined Rate: ₹{totalPerNightRate.toLocaleString("en-IN")} / night
                      </span>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: "bold",
                          color: "#c49d68",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        ₹{totalPrice.toLocaleString("en-IN")}{" "}
                        <span style={{ fontSize: "13px", color: "#fff" }}>
                          ({nights} Night{nights > 1 ? "s" : ""})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* STEP 03: ROOM GUEST OCCUPANCY (CONFIGURED PER ROOM) */}
            <section className="booking-section">
              <p className="step-label">STEP 03</p>
              <h2>Room Guest Occupancy</h2>

              <div className="room-occupancy-container">
                <div className="room-occupancy-header">
                  <div>
                    <h3 className="occupancy-section-title">
                      Configure Guests for {totalSelectedRooms} Room{totalSelectedRooms > 1 ? "s" : ""}
                    </h3>
                    <p className="occupancy-section-hint">
                      <strong>Policy:</strong> Maximum 4 guests per room (e.g. 4 adults max or 1 adult + 3 children). Minimum 1 adult required per room.
                    </p>
                  </div>
                  <div className="occupancy-total-badge">
                    Total:{" "}
                    <strong>
                      {totalGuests} Guest{totalGuests > 1 ? "s" : ""}
                    </strong>{" "}
                    ({totalAdults} Adult{totalAdults > 1 ? "s" : ""}
                    {totalChildren > 0
                      ? `, ${totalChildren} Child${totalChildren > 1 ? "ren" : ""}`
                      : ""}
                    ) across {totalSelectedRooms} Room{totalSelectedRooms > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="room-occupancy-list">
                  {roomGuests.map((rg, idx) => {
                    const assign = roomSuiteAssignments[idx];
                    const maxChildrenForThisRoom = 4 - rg.adults;

                    return (
                      <div key={idx} className="room-occupancy-card">
                        <div className="room-card-header">
                          <span className="room-card-tag">
                            RESIDENCE ROOM {idx + 1}{" "}
                            {assign && (
                              <span style={{ color: "#142217", fontWeight: "normal" }}>
                                · {assign.suite.name} (Room {assign.suiteRoomIndex})
                              </span>
                            )}
                          </span>
                          <span className="room-capacity-counter">
                            {rg.adults + rg.children} / 4 Guests
                          </span>
                        </div>

                        <div className="room-occupancy-fields">
                          <label>
                            ADULTS (AGES 13+)
                            <select
                              value={rg.adults}
                              onChange={(e) =>
                                handleAdultsChange(idx, e.target.value)
                              }
                            >
                              <option value={1}>1 Adult</option>
                              <option value={2}>2 Adults</option>
                              <option value={3}>3 Adults</option>
                              <option value={4}>4 Adults (Max Capacity)</option>
                            </select>
                          </label>

                          <label>
                            CHILDREN (AGES 0-12)
                            <select
                              value={rg.children}
                              onChange={(e) =>
                                handleChildrenChange(idx, e.target.value)
                              }
                            >
                              <option value={0}>0 Children</option>
                              {maxChildrenForThisRoom >= 1 && (
                                <option value={1}>1 Child</option>
                              )}
                              {maxChildrenForThisRoom >= 2 && (
                                <option value={2}>2 Children</option>
                              )}
                              {maxChildrenForThisRoom >= 3 && (
                                <option value={3}>
                                  3 Children (1 Adult + 3 Children)
                                </option>
                              )}
                            </select>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* STEP 04: GUEST DETAILS & CONFIRMATION EMAIL */}
            <section className="booking-section">
              <p className="step-label">STEP 04</p>
              <h2>Guest Details & Confirmation Email</h2>

              <div className="booking-fields">
                <label>
                  GUEST FULL NAME *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (!cardHolder) setCardHolder(e.target.value);
                    }}
                  />
                </label>

                <label>
                  EMAIL ADDRESS (VOUCHER WILL BE SENT HERE) *
                  <input
                    type="email"
                    required
                    placeholder="e.g. guest@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <label>
                  PHONE NUMBER
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* PROCEED TO PAYMENT BUTTON */}
            <div className="booking-next-action-wrapper">
              <div className="booking-next-summary-peek">
                <span>
                  Selected:{" "}
                  <strong>
                    {selectedSuitesList.map((s) => s.suite.name).join(" & ") || "No Suite"}
                  </strong>
                </span>
                <span> · </span>
                <span>{nights} Night{nights > 1 ? "s" : ""}</span>
                <span> · </span>
                <span>{totalSelectedRooms} Room{totalSelectedRooms > 1 ? "s" : ""}</span>
                <span> · </span>
                <span>{totalGuests} Guest{totalGuests > 1 ? "s" : ""}</span>
                <span> · </span>
                <span className="peek-price">₹{totalPrice.toLocaleString("en-IN")} Total</span>
              </div>

              <button
                type="submit"
                className="booking-submit"
                disabled={selectedSuitesList.length === 0}
              >
                {selectedSuitesList.length === 0
                  ? "Please Select an Available Suite"
                  : "Continue to Payment & Itinerary Review →"}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* PAGE 2: PAYMENT METHOD & STAY ITINERARY / TOTAL AMOUNT   */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <form onSubmit={handleBooking}>
            {/* Top Back Navigation Bar */}
            <div className="booking-page2-nav">
              <button
                type="button"
                className="btn-back-link"
                onClick={() => goToStep(1)}
              >
                ← Back to Suites & Guest Details
              </button>
              <span className="booking-page2-badge">Step 2 of 2: Payment & Confirmation</span>
            </div>

            {/* PAYMENT METHOD SECTION */}
            <section className="booking-section">
              <p className="step-label">PAYMENT METHOD</p>
              <h2>Select Payment Method</h2>

              <div className="room-options" style={{ marginBottom: "16px" }}>
                {/* 1. RAZORPAY GATEWAY (RECOMMENDED) */}
                <label
                  className="room-option"
                  style={{
                    border: paymentMethod === "Razorpay" ? "2px solid #142217" : "1px solid #d4c8b8",
                    background: paymentMethod === "Razorpay" ? "#fbf8f3" : "#ffffff",
                    cursor: "pointer",
                    padding: "16px 20px",
                    borderRadius: "6px",
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Razorpay"
                    checked={paymentMethod === "Razorpay"}
                    onChange={() => setPaymentMethod("Razorpay")}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                      <strong style={{ fontSize: "15px", color: "#142217" }}>
                        Razorpay Gateway (Cards, UPI, NetBanking, Wallets)
                      </strong>
                      <span
                        style={{
                          fontSize: "10px",
                          background: "#142217",
                          color: "#c49d68",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontWeight: "bold",
                          letterSpacing: "1px",
                        }}
                      >
                        ★ RECOMMENDED · INSTANT VERIFICATION
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
                      Instant secure checkout with Google Pay, PhonePe, Paytm, all Credit/Debit cards (Visa, MasterCard, RuPay), 50+ NetBanking banks & Wallets.
                    </p>
                  </div>
                </label>

                {/* 2. PAY AT RESORT */}
                <label className="room-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Pay at Resort"
                    checked={paymentMethod === "Pay at Resort"}
                    onChange={() => setPaymentMethod("Pay at Resort")}
                  />
                  <div>
                    <strong>Pay Upon Arrival at Resort</strong>
                    <p>Guaranteed reservation with complimentary concierge check-in valet</p>
                  </div>
                </label>

                {/* 3. DEMO CREDIT / DEBIT CARD */}
                <label className="room-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Credit/Debit Card"
                    checked={paymentMethod === "Credit/Debit Card"}
                    onChange={() => setPaymentMethod("Credit/Debit Card")}
                  />
                  <div>
                    <strong>Direct Demo Card (Simulated Gateway)</strong>
                    <p>Instant simulated authorization with demo card credentials</p>
                  </div>
                </label>
              </div>

              {/* Razorpay Information Box */}
              {paymentMethod === "Razorpay" && (
                <div
                  style={{
                    background: "#fbf9f5",
                    border: "1px solid #ebd8c0",
                    padding: "16px 20px",
                    borderRadius: "6px",
                    marginTop: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#142217" }}>
                      🔒 256-Bit SSL Encrypted Razorpay Checkout
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#1f7a3f",
                        background: "#dcfce7",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      RBI & PCI-DSS Level 1 Compliant
                    </span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#666", lineHeight: "1.5" }}>
                    Clicking <strong>"Proceed to Razorpay Checkout"</strong> below will open the official Razorpay Checkout window to securely authenticate and process your transaction with an instant confirmed booking receipt.
                  </p>
                </div>
              )}

              {paymentMethod === "Credit/Debit Card" && (
                <div className="booking-fields">
                  <label>
                    CARDHOLDER NAME
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Name as on card"
                    />
                  </label>
                  <label>
                    CARD NUMBER (DEMO GATEWAY)
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={{
                        background: "#fdfbf8",
                        color: "#142217",
                        fontWeight: "500",
                      }}
                    />
                  </label>
                  <label>
                    EXPIRY
                    <input
                      type="text"
                      defaultValue="12 / 28"
                      style={{ background: "#fdfbf8", color: "#142217" }}
                    />
                  </label>
                  <label>
                    CVV / CVC
                    <input
                      type="password"
                      defaultValue="888"
                      maxLength={4}
                      style={{ background: "#fdfbf8", color: "#142217" }}
                    />
                  </label>
                </div>
              )}

              {paymentMethod === "Pay at Resort" && (
                <div
                  style={{
                    background: "#f0f7f2",
                    border: "1px solid #c2e2cc",
                    padding: "16px 20px",
                    borderRadius: "6px",
                    marginTop: "12px",
                    color: "#1e5e31",
                    fontSize: "13px",
                  }}
                >
                  ✓ Your residence is 100% reserved. Pay with cash, card, or UPI during concierge check-in at the resort reception.
                </div>
              )}
            </section>

            {/* STAY ITINERARY & TOTAL AMOUNT SECTION */}
            <section className="booking-section booking-summary">
              <p className="step-label">RESERVATION REVIEW</p>
              <h2>Stay Itinerary & Total Amount</h2>

              {/* Selected Suites Cards List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                {selectedSuitesList.map(({ suite, roomsCount: sRooms }) => {
                  const sPrice = suite.pricePerNight || suite.price || 15000;
                  const suiteTotal = nights * sPrice * sRooms;

                  return (
                    <div key={suite._id} className="itinerary-suite-preview">
                      <img
                        src={suite.image || "/images/viceroy-bedroom.jpg"}
                        alt={suite.name}
                        className="preview-suite-thumb"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/home1.png";
                        }}
                      />
                      <div className="preview-suite-info">
                        <span className="preview-suite-badge">
                          {suite.category || "LUXURY SUITE"} · SUITE {suite.roomNumber || "101"} · 📍 {suite.location || "Coastal Sanctuary"}
                        </span>
                        <h3 className="preview-suite-title">{suite.name}</h3>
                        <p className="preview-suite-rate">
                          {sRooms} Room{sRooms > 1 ? "s" : ""} booked in this suite × ₹{sPrice.toLocaleString("en-IN")} / room / night
                        </p>
                        <p style={{ margin: "4px 0 0", color: "#c49d68", fontWeight: "bold", fontSize: "14px" }}>
                          Suite Subtotal: ₹{suiteTotal.toLocaleString("en-IN")} ({nights} nights)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Itinerary Specs Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "14px",
                  margin: "20px 0",
                  padding: "16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "6px",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>CHECK-IN</small>
                  <strong style={{ fontSize: "15px" }}>{checkIn}</strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>CHECK-OUT</small>
                  <strong style={{ fontSize: "15px" }}>{checkOut}</strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>DURATION</small>
                  <strong style={{ fontSize: "15px" }}>{nights} Night{nights > 1 ? "s" : ""}</strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>SUITES & ROOMS</small>
                  <strong style={{ fontSize: "15px" }}>
                    {selectedSuitesList.length} Suite{selectedSuitesList.length > 1 ? "s" : ""} · {totalSelectedRooms} Room{totalSelectedRooms > 1 ? "s" : ""}
                  </strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>TOTAL OCCUPANCY</small>
                  <strong style={{ fontSize: "15px" }}>
                    {totalGuests} Guests ({totalAdults} Adults{totalChildren > 0 ? `, ${totalChildren} Children` : ""})
                  </strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>PRIMARY GUEST</small>
                  <strong style={{ fontSize: "15px" }}>{guestName}</strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>CONFIRMATION EMAIL</small>
                  <strong style={{ fontSize: "15px" }}>{email}</strong>
                </div>

                <div>
                  <small style={{ color: "#c49d68", display: "block", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase" }}>PAYMENT METHOD</small>
                  <strong style={{ fontSize: "15px" }}>{paymentMethod}</strong>
                </div>
              </div>

              {/* Calculated Total Price Card */}
              <div
                style={{
                  background: "#142217",
                  border: "1px solid #c49d68",
                  color: "#c49d68",
                  padding: "20px 24px",
                  borderRadius: "6px",
                  margin: "18px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "12px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      color: "#e0d7c7",
                    }}
                  >
                    Calculated Total Stay Amount
                  </span>
                  <h3
                    style={{
                      margin: "4px 0 0",
                      fontSize: "30px",
                      color: "#ffffff",
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}
                  >
                    ₹{totalPrice.toLocaleString("en-IN")}
                  </h3>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "13px",
                    color: "#c49d68",
                  }}
                >
                  <span>
                    ({nights} Night{nights > 1 ? "s" : ""} × {totalSelectedRooms} Room{totalSelectedRooms > 1 ? "s" : ""} across {selectedSuitesList.length} Suite{selectedSuitesList.length > 1 ? "s" : ""})
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "13px", color: "#ccc", margin: "12px 0 20px" }}>
                🌿 Included with your stay: Daily artisan breakfast, high-speed Wi-Fi, private concierge care, valet parking, and free cancellation up to 48 hours before check-in.
              </p>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  type="submit"
                  className="booking-submit"
                  disabled={submitting}
                >
                  {submitting
                    ? paymentMethod === "Razorpay"
                      ? "Connecting to Razorpay..."
                      : "Processing Reservation & Email Voucher..."
                    : paymentMethod === "Razorpay"
                    ? `Proceed to Razorpay Checkout (₹${totalPrice.toLocaleString("en-IN")})`
                    : paymentMethod === "Pay at Resort"
                    ? `Reserve Now & Pay at Resort (₹${totalPrice.toLocaleString("en-IN")})`
                    : `Pay & Confirm Stay (₹${totalPrice.toLocaleString("en-IN")})`}
                </button>

                <button
                  type="button"
                  className="booking-secondary-back"
                  onClick={() => goToStep(1)}
                >
                  ← Modify Suites, Rooms & Dates
                </button>
              </div>
            </section>
          </form>
        )}
      </main>
    </>
  );
}

export default Booking;