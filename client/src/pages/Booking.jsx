import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  checkDateRangeAvailability,
  fetchRooms,
  fetchAdminProfile,
  fetchMyBookings,
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
  const diffDays = Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

const resolveImgUrl = (url) => {
  if (!url) return "/images/munnar-room-living.jpg";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/uploads/")) {
    return `http://localhost:4000${url}`;
  }
  return url;
};

// Signature Munnar Three Room Types

// Metadata for the Three Signature Munnar Room Types
export const ROOM_CATEGORIES_METADATA = {
  family: {
    key: "family",
    name: "Family Rooms",
    tagline: "Multiple beds and space for families",
    badge: "UP TO 6 GUESTS · MULTI-BED",
    priceText: "₹16,000 / night",
    primaryImg: "/images/munnar-room-living.jpg",
    description:
      "Multiple beds and space for families. Features a cozy wood-burning stone fireplace, interconnected family bedroom spaces, mountain-view balcony, and spacious living area above the Munnar clouds.",
    photos: [
      {
        label: "Fireplace Living Room",
        img: "/images/munnar-room-living.jpg",
        desc: "Cozy wood-burning stone fireplace & panoramic mountain tea estate vista.",
      },
      {
        label: "Multiple Family Beds",
        img: "/images/munnar-room-bedroom.jpg",
        desc: "Spacious sleeping quarters with multiple beds crafted from Kerala teak.",
      },
      {
        label: "Tea Mountain Balcony",
        img: "/images/balcony.png",
        desc: "Private sit-out balcony overlooking misty morning tea gardens.",
      },
      {
        label: "Family Dining Area",
        img: "/images/dinningarea.png",
        desc: "Private highland dining salon for shared meals above the clouds.",
      },
    ],
  },
  garden: {
    key: "garden",
    name: "Garden Rooms",
    tagline: "Private villa surrounded by greenery",
    badge: "NATURE VILLA · GREENERY",
    priceText: "₹14,000 / night",
    primaryImg: "/images/garden.png",
    description:
      "Private villa surrounded by greenery, misty flora, and flowering pathways. Features direct garden access, stone walkway, stream bridge views, and secluded outdoor deck in nature.",
    photos: [
      {
        label: "Private Green Villa",
        img: "/images/garden.png",
        desc: "Standalone secluded cottage villa enveloped in botanical greenery.",
      },
      {
        label: "Stream & Bridge Walkway",
        img: "/images/munnar-signup.jpg",
        desc: "Misty stone footpaths and wooden bridge over crystal mountain streams.",
      },
      {
        label: "Valley Infinity Pool",
        img: "/images/poolarea.png",
        desc: "Highland mountain pool overlooking lush tea slopes and mountain air.",
      },
      {
        label: "Verdant Garden Balcony",
        img: "/images/balcony.png",
        desc: "Private balcony surrounded by indigenous ferns, flora, and tea bushes.",
      },
    ],
  },
  presidential: {
    key: "presidential",
    name: "Presidential Rooms",
    tagline: "Premium accommodation with multiple rooms",
    badge: "PREMIUM MULTI-ROOM · BUTLER",
    priceText: "₹25,000 / night",
    primaryImg: "/images/munnar-room-bedroom.jpg",
    description:
      "Premium accommodation with multiple rooms. Features a grand four-poster master suite, arched private dining salon, artisan copper & natural slate bath, 360° estate mist views, and dedicated 24/7 butler care.",
    photos: [
      {
        label: "Royal Four-Poster Master",
        img: "/images/munnar-room-bedroom.jpg",
        desc: "Four-poster teak master bedroom overlooking rolling misty peaks.",
      },
      {
        label: "Arched Dining Salon",
        img: "/images/munnar-room-dining.jpg",
        desc: "Grand private dining salon framed by stone arches and estate views.",
      },
      {
        label: "Copper & Slate Luxury Bath",
        img: "/images/munnar-room-bath.jpg",
        desc: "Artisan hammered copper wash basin, rain shower, and mountain view window.",
      },
      {
        label: "Summit Estate Panorama",
        img: "/images/frontview.png",
        desc: "Sweeping summit view of Viceroy Munnar cottages amidst tea plantations.",
      },
    ],
  },
};

export const getCategoryMeta = (category = "", name = "") => {
  const c = `${category} ${name}`.toLowerCase();
  if (c.includes("garden")) return ROOM_CATEGORIES_METADATA.garden;
  if (c.includes("presidential")) return ROOM_CATEGORIES_METADATA.presidential;
  return ROOM_CATEGORIES_METADATA.family;
};

const DEFAULT_MUNNAR_SUITES = [
  {
    _id: "room-family-101",
    roomNumber: "101",
    name: "Highland Family Villa",
    location: "Munnar Tea Slopes · 5,200 ft",
    category: "Family Rooms",
    pricePerNight: 16000,
    price: 16000,
    capacity: 6,
    totalRooms: 4,
    status: "available",
    image: "/images/munnar-room-living.jpg",
    images: [
      "/images/munnar-room-living.jpg",
      "/images/munnar-room-bedroom.jpg",
      "/images/balcony.png",
      "/images/dinningarea.png",
    ],
    amenities: [
      "Multiple Beds & Family Living Space",
      "Wood-Burning Stone Fireplace",
      "Misty Mountain View Balcony",
      "Complimentary High Tea for Family",
      "High-speed Wi-Fi",
      "Children's Welcome Kit",
    ],
    description:
      "Multiple beds and space for families. Features a stone fireplace, private balcony overlooking tea estates, interconnected sleeping spaces, and plenty of space to relax together above the clouds.",
  },
  {
    _id: "room-garden-102",
    roomNumber: "102",
    name: "Botanical Garden Villa",
    location: "Munnar Botanical Valley · 5,200 ft",
    category: "Garden Rooms",
    pricePerNight: 14000,
    price: 14000,
    capacity: 4,
    totalRooms: 4,
    status: "available",
    image: "/images/garden.png",
    images: [
      "/images/garden.png",
      "/images/munnar-signup.jpg",
      "/images/poolarea.png",
      "/images/balcony.png",
    ],
    amenities: [
      "Private Villa Surrounded by Greenery",
      "Direct Garden & Pathway Access",
      "Stone Walkway & Stream Bridge Views",
      "Private Outdoor Deck",
      "Organic Tea Bar",
      "Deep Soaking Tub",
    ],
    description:
      "Private villa surrounded by greenery, misty slopes, and lush flora. Features direct garden access, stone pathways, wooden bridge views, secluded outdoor sitting deck, and peaceful nature walks.",
  },
  {
    _id: "room-presidential-103",
    roomNumber: "103",
    name: "Royal Presidential Sanctuary",
    location: "Munnar Summit Peak · 5,200 ft",
    category: "Presidential Rooms",
    pricePerNight: 25000,
    price: 25000,
    capacity: 4,
    totalRooms: 4,
    status: "available",
    image: "/images/munnar-room-bedroom.jpg",
    images: [
      "/images/munnar-room-bedroom.jpg",
      "/images/munnar-room-dining.jpg",
      "/images/munnar-room-bath.jpg",
      "/images/frontview.png",
    ],
    amenities: [
      "Premium Accommodation with Multiple Rooms",
      "Master Four-Poster Teak Suite",
      "Private Arched Dining Salon",
      "Artisan Copper & Slate Luxury Bath",
      "24/7 Dedicated Butler Service",
      "Panoramic 360° Cloud & Estate Views",
    ],
    description:
      "Premium accommodation with multiple rooms. Features a grand four-poster master suite, separate arched dining salon, handcrafted copper & slate bath, panoramic 360° cloud views, and dedicated 24/7 personal butler care.",
  },
];

function Booking() {
  const navigate = useNavigate();

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

  // Modal for previewing Munnar suite interior photos
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Dates
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);

  // Suites & Availability Inventory
  const [availableSuites, setAvailableSuites] = useState([]);
  const [loadingSuites, setLoadingSuites] = useState(true);
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

    // Restore draft state if user returned from payment page
    try {
      const storedDraft = sessionStorage.getItem("viceroy_booking_draft");
      if (storedDraft) {
        const draft = JSON.parse(storedDraft);
        if (draft.checkIn) setCheckIn(draft.checkIn);
        if (draft.checkOut) setCheckOut(draft.checkOut);
        if (draft.guestName) setGuestName(draft.guestName);
        if (draft.email) setEmail(draft.email);
        if (draft.phone) setPhone(draft.phone);
        if (Array.isArray(draft.roomGuests) && draft.roomGuests.length > 0) {
          setRoomGuests(draft.roomGuests);
        }
      }
    } catch {}

    // Load dynamic rooms from database
    fetchRooms()
      .then((data) => {
        const roomsList = Array.isArray(data) ? data : data?.rooms || [];
        const finalRooms = roomsList.length > 0 ? roomsList : DEFAULT_MUNNAR_SUITES;
        setAvailableSuites(finalRooms);
        // Pre-select first available suite with 1 room
        const firstAvail = finalRooms.find(isRoomAvailable);
        if (firstAvail) {
          setSelectedSuitesMap({
            [firstAvail._id]: {
              suite: firstAvail,
              roomsCount: 1,
            },
          });
        }
      })
      .catch((err) => {
        console.warn("Could not load suites from database, using Munnar room types:", err.message);
        setAvailableSuites(DEFAULT_MUNNAR_SUITES);
        setSelectedSuitesMap({
          [DEFAULT_MUNNAR_SUITES[0]._id]: {
            suite: DEFAULT_MUNNAR_SUITES[0],
            roomsCount: 1,
          },
        });
      })
      .finally(() => {
        setLoadingSuites(false);
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

  // Filtered suites by active tab & room types
  const displayedSuites = availableSuites.filter((suite) => {
    if (suiteFilter === "available") return isRoomAvailable(suite);
    if (suiteFilter === "booked") return !isRoomAvailable(suite);
    if (suiteFilter === "family") return (suite.category + " " + suite.name).toLowerCase().includes("family");
    if (suiteFilter === "garden") return (suite.category + " " + suite.name).toLowerCase().includes("garden");
    if (suiteFilter === "presidential") return (suite.category + " " + suite.name).toLowerCase().includes("presidential");
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

    const bookingState = {
      checkIn,
      checkOut,
      nights,
      selectedSuitesList,
      roomGuests,
      guestName: guestName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      totalPrice,
      totalSelectedRooms,
      totalAdults,
      totalChildren,
      totalGuests,
    };

    try {
      sessionStorage.setItem("viceroy_booking_draft", JSON.stringify(bookingState));
    } catch {}

    navigate("/payment", { state: { bookingState } });
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
          roomId: suite._id,
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
        roomId: primary._id,
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
        cardLast4: paymentMethod === "Wallet" ? "WALL" : "0000",
        notes: `${totalSelectedRooms} Room(s) across ${selectedSuitesList.length} Suite(s) · ${totalAdults} Adult(s), ${totalChildren} Child(ren) (${roomBreakdownNote})`,
      };

      // 0. WALLET BALANCE VALIDATION
      if (paymentMethod === "Wallet") {
        if (walletBalance < totalPrice) {
          throw new Error(
            `Insufficient Viceroy Guest Wallet balance. Your balance is ₹${walletBalance.toLocaleString("en-IN")}, but reservation total is ₹${totalPrice.toLocaleString("en-IN")}. Please select Razorpay or Pay Upon Arrival.`
          );
        }
      }

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

      // 2. DIRECT OR ALTERNATIVE PAYMENT (Viceroy Wallet / Pay at Resort)
      const booking = await createBookingReservation(bookingData);

      if (paymentMethod === "Wallet") {
        const newBal = typeof booking?.walletBalance === "number"
          ? booking.walletBalance
          : Math.max(0, walletBalance - totalPrice);
        setWalletBalance(newBal);
        if (currentUser) {
          localStorage.setItem("user", JSON.stringify({ ...currentUser, walletBalance: newBal }));
        }
      }

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
          <p>VICEROY RESORT MUNNAR · RESERVATIONS</p>
          <h1>Curate Your Highland Sanctuary Itinerary</h1>
          <p>
            Select your stay dates, explore our luxury Munnar suites, configure guest occupancy, and proceed to payment on the next page.
          </p>
        </header>

       


        {/* Step Indicator Navigation */}
        <nav className="booking-stepper" aria-label="Booking steps">
          <div className="stepper-step active">
            <div className="step-number">1</div>
            <div className="step-text">
              <span className="step-title">1. Suites & Dates</span>
              <span className="step-subtitle">Active Step · Select Residences</span>
            </div>
          </div>

          <div className="stepper-divider" />

          <div
            className="stepper-step upcoming"
            onClick={handleProceedToPayment}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            title="Click to proceed to Payment"
          >
            <div className="step-number">2</div>
            <div className="step-text">
              <span className="step-title">2. Payment & Confirmation</span>
              <span className="step-subtitle">Next Page Checkout →</span>
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

        {/* Booking Itinerary Form */}
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
                  <h2>Select Accommodation & Number of Rooms</h2>
                  <p style={{ margin: "4px 0 0", color: "#6e6b66", fontSize: "14px" }}>
                    Explore our three signature room categories below. Click any card to filter by room type or click photos to preview high-resolution room interiors.
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

              {/* THREE SIGNATURE ROOM TYPES SHOWCASE WITH PHOTOS */}
              <div style={{ marginTop: "24px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", color: "#142217", fontFamily: "Georgia, serif" }}>
                      Three Signature Room Categories
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#666" }}>
                      Click any card below to filter residences, or click photo thumbnails to preview high-resolution rooms.
                    </p>
                  </div>
                  {suiteFilter !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSuiteFilter("all")}
                      style={{
                        fontSize: "12px",
                        color: "#8c6f44",
                        background: "#f4ede1",
                        border: "1px solid #dcd3c4",
                        borderRadius: "14px",
                        padding: "4px 12px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      ✕ Show All ({availableSuites.length})
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                    gap: "18px",
                  }}
                >
                  {/* 1. Family Rooms */}
                  <div
                    onClick={() => setSuiteFilter(suiteFilter === "family" ? "all" : "family")}
                    style={{
                      background: "#ffffff",
                      border: suiteFilter === "family" ? "2px solid #c49d68" : "1px solid #e0d8cb",
                      borderRadius: "10px",
                      overflow: "hidden",
                      boxShadow: suiteFilter === "family" ? "0 8px 24px rgba(196,157,104,0.25)" : "0 4px 14px rgba(20,34,23,0.06)",
                      transition: "all 0.25s ease",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ position: "relative", height: "165px", background: "#142217", overflow: "hidden" }}>
                      <img
                        src="/images/munnar-room-living.jpg"
                        alt="Family Rooms"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,34,23,0.85) 0%, rgba(20,34,23,0.1) 60%)" }} />
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          background: "rgba(20,34,23,0.8)",
                          backdropFilter: "blur(4px)",
                          color: "#f5eee2",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        UP TO 6 GUESTS · MULTI-BED
                      </span>
                      <span
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "12px",
                          color: "#ffffff",
                          fontFamily: "Georgia, serif",
                          fontSize: "18px",
                          fontWeight: "600",
                        }}
                      >
                        👨‍👩‍👧‍👦 Family Rooms
                      </span>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "700", color: "#142217" }}>
                          Multiple beds and space for families
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                          Interconnected bedroom spaces, cozy stone fireplace, mountain balcony, and ample room to relax together.
                        </p>
                        <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: "700", color: "#8c6f44" }}>
                          From ₹16,000 / night
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e6dfd2" }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", color: "#8c6f44", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                          📸 Family Room Photos (Click to Zoom):
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {ROOM_CATEGORIES_METADATA.family.photos.map((p, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoModal({
                                  title: `Family Rooms · ${p.label}`,
                                  image: p.img,
                                  category: "Family Rooms",
                                  desc: p.desc,
                                  photoList: ROOM_CATEGORIES_METADATA.family.photos,
                                  photoIndex: idx,
                                });
                              }}
                              title={`Click to enlarge ${p.label}`}
                              style={{
                                position: "relative",
                                flex: 1,
                                height: "46px",
                                borderRadius: "4px",
                                overflow: "hidden",
                                border: "1px solid #d4cbbd",
                                cursor: "pointer",
                              }}
                            >
                              <img src={p.img} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: suiteFilter === "family" ? "#1f7a3f" : "#8c6f44" }}>
                          {suiteFilter === "family" ? "✓ Filter Active" : "Click to view Family Rooms →"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Garden Rooms */}
                  <div
                    onClick={() => setSuiteFilter(suiteFilter === "garden" ? "all" : "garden")}
                    style={{
                      background: "#ffffff",
                      border: suiteFilter === "garden" ? "2px solid #c49d68" : "1px solid #e0d8cb",
                      borderRadius: "10px",
                      overflow: "hidden",
                      boxShadow: suiteFilter === "garden" ? "0 8px 24px rgba(196,157,104,0.25)" : "0 4px 14px rgba(20,34,23,0.06)",
                      transition: "all 0.25s ease",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ position: "relative", height: "165px", background: "#142217", overflow: "hidden" }}>
                      <img
                        src="/images/garden.png"
                        alt="Garden Rooms"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,34,23,0.85) 0%, rgba(20,34,23,0.1) 60%)" }} />
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          background: "rgba(20,34,23,0.8)",
                          backdropFilter: "blur(4px)",
                          color: "#f5eee2",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        NATURE VILLA · GREENERY
                      </span>
                      <span
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "12px",
                          color: "#ffffff",
                          fontFamily: "Georgia, serif",
                          fontSize: "18px",
                          fontWeight: "600",
                        }}
                      >
                        🌿 Garden Rooms
                      </span>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "700", color: "#142217" }}>
                          Private villa surrounded by greenery
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                          Standalone secluded villa amidst botanical flora, mountain stream wooden footbridge, and peaceful nature walks.
                        </p>
                        <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: "700", color: "#8c6f44" }}>
                          From ₹14,000 / night
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e6dfd2" }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", color: "#8c6f44", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                          📸 Garden Room Photos (Click to Zoom):
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {ROOM_CATEGORIES_METADATA.garden.photos.map((p, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoModal({
                                  title: `Garden Rooms · ${p.label}`,
                                  image: p.img,
                                  category: "Garden Rooms",
                                  desc: p.desc,
                                  photoList: ROOM_CATEGORIES_METADATA.garden.photos,
                                  photoIndex: idx,
                                });
                              }}
                              title={`Click to enlarge ${p.label}`}
                              style={{
                                position: "relative",
                                flex: 1,
                                height: "46px",
                                borderRadius: "4px",
                                overflow: "hidden",
                                border: "1px solid #d4cbbd",
                                cursor: "pointer",
                              }}
                            >
                              <img src={p.img} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: suiteFilter === "garden" ? "#1f7a3f" : "#8c6f44" }}>
                          {suiteFilter === "garden" ? "✓ Filter Active" : "Click to view Garden Rooms →"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Presidential Rooms */}
                  <div
                    onClick={() => setSuiteFilter(suiteFilter === "presidential" ? "all" : "presidential")}
                    style={{
                      background: "#ffffff",
                      border: suiteFilter === "presidential" ? "2px solid #c49d68" : "1px solid #e0d8cb",
                      borderRadius: "10px",
                      overflow: "hidden",
                      boxShadow: suiteFilter === "presidential" ? "0 8px 24px rgba(196,157,104,0.25)" : "0 4px 14px rgba(20,34,23,0.06)",
                      transition: "all 0.25s ease",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ position: "relative", height: "165px", background: "#142217", overflow: "hidden" }}>
                      <img
                        src="/images/munnar-room-bedroom.jpg"
                        alt="Presidential Rooms"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,34,23,0.85) 0%, rgba(20,34,23,0.1) 60%)" }} />
                      <span
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: "10px",
                          background: "rgba(20,34,23,0.8)",
                          backdropFilter: "blur(4px)",
                          color: "#f5eee2",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "1px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      >
                        PREMIUM MULTI-ROOM · BUTLER
                      </span>
                      <span
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "12px",
                          color: "#ffffff",
                          fontFamily: "Georgia, serif",
                          fontSize: "18px",
                          fontWeight: "600",
                        }}
                      >
                        👑 Presidential Rooms
                      </span>
                    </div>

                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "700", color: "#142217" }}>
                          Premium accommodation with multiple rooms
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                          Multi-room residence with teak four-poster master suite, arched dining salon, artisan copper bath & butler care.
                        </p>
                        <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: "700", color: "#8c6f44" }}>
                          From ₹25,000 / night
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e6dfd2" }}>
                        <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.5px", color: "#8c6f44", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                          📸 Presidential Photos (Click to Zoom):
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {ROOM_CATEGORIES_METADATA.presidential.photos.map((p, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoModal({
                                  title: `Presidential Rooms · ${p.label}`,
                                  image: p.img,
                                  category: "Presidential Rooms",
                                  desc: p.desc,
                                  photoList: ROOM_CATEGORIES_METADATA.presidential.photos,
                                  photoIndex: idx,
                                });
                              }}
                              title={`Click to enlarge ${p.label}`}
                              style={{
                                position: "relative",
                                flex: 1,
                                height: "46px",
                                borderRadius: "4px",
                                overflow: "hidden",
                                border: "1px solid #d4cbbd",
                                cursor: "pointer",
                              }}
                            >
                              <img src={p.img} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: suiteFilter === "presidential" ? "#1f7a3f" : "#8c6f44" }}>
                          {suiteFilter === "presidential" ? "✓ Filter Active" : "Click to view Presidential Rooms →"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="suite-filter-bar" style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "all" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("all")}
                >
                  All Rooms ({availableSuites.length})
                </button>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "family" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("family")}
                >
                  👨‍👩‍👧‍👦 Family Rooms
                </button>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "garden" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("garden")}
                >
                  🌿 Garden Rooms
                </button>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "presidential" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("presidential")}
                >
                  👑 Presidential Rooms
                </button>
                <button
                  type="button"
                  className={`suite-filter-btn ${suiteFilter === "available" ? "active" : ""}`}
                  onClick={() => setSuiteFilter("available")}
                >
                  🟢 Open ({totalAvailableSuites})
                </button>
              </div>

              {/* Suite Cards List with Checkbox Multi-selection & Rooms count per suite */}
              {loadingSuites ? (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "#8a7c6a" }}>
                  <div style={{ fontSize: "28px", marginBottom: "12px", animation: "spin 2s linear infinite" }}>⏳</div>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: "#142217" }}>
                    Loading luxury residences from database...
                  </p>
                </div>
              ) : displayedSuites.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 24px",
                    background: "#fdfbf7",
                    border: "1px dashed #dcd3c5",
                    borderRadius: "8px",
                    color: "#8a7c6a",
                  }}
                >
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#142217", marginBottom: "8px" }}>
                    No suites available matching your criteria.
                  </p>
                  <p style={{ fontSize: "13px" }}>
                    Please adjust your dates or filter options to explore other dates.
                  </p>
                </div>
              ) : (
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
                    const meta = getCategoryMeta(suite.category, suite.name);
                    const currentSelectedRooms = selectedSuitesMap[suite._id]?.roomsCount || 1;
                    const suiteImage = resolveImgUrl(suite.image);

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
                        <div
                          className="suite-image-wrapper"
                          style={{ cursor: "zoom-in" }}
                          title="Click to preview room photo"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePhotoModal({
                              title: `${suite.name} · Flagship View`,
                              image: suiteImage,
                              category: meta.name,
                              desc: suite.description || meta.description,
                              photoList: meta.photos,
                              photoIndex: 0,
                            });
                          }}
                        >
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

                        <span
                            style={{
                              position: "absolute",
                              bottom: "8px",
                              right: "8px",
                              background: "rgba(20, 34, 23, 0.8)",
                              color: "#ffffff",
                              fontSize: "10px",
                              padding: "2px 7px",
                              borderRadius: "12px",
                              fontWeight: "bold",
                              backdropFilter: "blur(2px)",
                              zIndex: 2,
                            }}
                          >
                            🔍 Zoom Photo
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

                            {/* Exact Signature Room Type Tagline */}
                            <p
                              style={{
                                margin: "4px 0 6px",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#8c6f44",
                                fontStyle: "italic",
                              }}
                            >
                              "{meta.tagline}"
                            </p>

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
                            "Highland sanctuary in Munnar curated with handcrafted teak, stone fireplace, private balcony, and personalized care."}
                        </p>

                        {/* Interactive Munnar Suite Gallery Preview */}
                        <div
                          className="suite-gallery-preview-row"
                          style={{
                            marginTop: "14px",
                            paddingTop: "12px",
                            borderTop: "1px dashed #e5decf",
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
                              marginBottom: "8px",
                            }}
                          >
                            📸 {meta.name} Interior & Scenic Gallery (Click to Enlarge):
                          </span>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {meta.photos.map((photo, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePhotoModal({
                                    title: `${suite.name} · ${photo.label}`,
                                    image: photo.img,
                                    category: meta.name,
                                    desc: photo.desc,
                                    photoList: meta.photos,
                                    photoIndex: pIdx,
                                  });
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "5px 12px",
                                  background: "#ffffff",
                                  border: "1px solid #dcd3c4",
                                  borderRadius: "18px",
                                  fontSize: "11px",
                                  fontFamily: "Arial, sans-serif",
                                  color: "#142217",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                                }}
                                title={`Click to enlarge ${photo.label}`}
                              >
                                <img
                                  src={photo.img}
                                  alt={photo.label}
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                  }}
                                />
                                <span style={{ fontWeight: "600" }}>{photo.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

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
            )}

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
                    onChange={(e) => setGuestName(e.target.value)}
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
                  : `Proceed to Payment (₹${totalPrice.toLocaleString("en-IN")}) →`}
              </button>
            </div>
          </form>

        {/* Fullscreen Photo Lightbox Modal with Multi-Photo Navigation */}
        {activePhotoModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(10, 18, 12, 0.88)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={() => setActivePhotoModal(null)}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "840px",
                width: "100%",
                background: "#ffffff",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 25px 70px rgba(0,0,0,0.6)",
                display: "flex",
                flexDirection: "column",
                maxHeight: "92vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  background: "#142217",
                  color: "#ffffff",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        letterSpacing: "1px",
                        background: "#c49d68",
                        color: "#142217",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                      }}
                    >
                      {activePhotoModal.category || "Viceroy Munnar"}
                    </span>
                    <h4 style={{ margin: 0, fontSize: "16px", fontFamily: "Georgia, serif" }}>
                      {activePhotoModal.title}
                    </h4>
                  </div>
                  <span style={{ fontSize: "11px", color: "#c49d68", marginTop: "2px", display: "block" }}>
                    Viceroy Luxury Resort · Munnar Hills, Kerala (5,200 ft)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "26px",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: "4px 8px",
                  }}
                  aria-label="Close photo preview"
                >
                  ×
                </button>
              </div>

              {/* Modal Image View with Prev / Next arrows */}
              <div
                style={{
                  position: "relative",
                  background: "#000000",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "340px",
                  maxHeight: "56vh",
                  overflow: "hidden",
                }}
              >
                <img
                  src={activePhotoModal.image}
                  alt={activePhotoModal.title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "56vh",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />

                {activePhotoModal.photoList && activePhotoModal.photoList.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const list = activePhotoModal.photoList;
                        const currIdx = activePhotoModal.photoIndex ?? 0;
                        const prevIdx = (currIdx - 1 + list.length) % list.length;
                        const target = list[prevIdx];
                        setActivePhotoModal({
                          ...activePhotoModal,
                          title: target.label,
                          image: target.img,
                          desc: target.desc,
                          photoIndex: prevIdx,
                        });
                      }}
                      style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(20, 34, 23, 0.75)",
                        color: "#ffffff",
                        border: "1px solid rgba(196,157,104,0.5)",
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        zIndex: 10,
                      }}
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const list = activePhotoModal.photoList;
                        const currIdx = activePhotoModal.photoIndex ?? 0;
                        const nextIdx = (currIdx + 1) % list.length;
                        const target = list[nextIdx];
                        setActivePhotoModal({
                          ...activePhotoModal,
                          title: target.label,
                          image: target.img,
                          desc: target.desc,
                          photoIndex: nextIdx,
                        });
                      }}
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(20, 34, 23, 0.75)",
                        color: "#ffffff",
                        border: "1px solid rgba(196,157,104,0.5)",
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        zIndex: 10,
                      }}
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {/* Photo Thumbnails Strip (if multiple photos) */}
              {activePhotoModal.photoList && activePhotoModal.photoList.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    padding: "10px 16px",
                    background: "#19241b",
                    overflowX: "auto",
                    justifyContent: "center",
                  }}
                >
                  {activePhotoModal.photoList.map((p, idx) => {
                    const isSelectedThumb = activePhotoModal.image === p.img;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActivePhotoModal({
                            ...activePhotoModal,
                            title: p.label,
                            image: p.img,
                            desc: p.desc,
                            photoIndex: idx,
                          });
                        }}
                        style={{
                          border: isSelectedThumb ? "2px solid #c49d68" : "1px solid rgba(255,255,255,0.2)",
                          borderRadius: "4px",
                          overflow: "hidden",
                          cursor: "pointer",
                          padding: 0,
                          background: "#000",
                          opacity: isSelectedThumb ? 1 : 0.65,
                          transition: "all 0.2s ease",
                        }}
                        title={p.label}
                      >
                        <img
                          src={p.img}
                          alt={p.label}
                          style={{ width: "54px", height: "38px", objectFit: "cover", display: "block" }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Modal Footer Description */}
              <div
                style={{
                  padding: "12px 20px",
                  background: "#fbf9f4",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "12px", color: "#555", fontFamily: "Arial, sans-serif", flex: 1 }}>
                  {activePhotoModal.desc ||
                    "Highland suite crafted with natural teak wood, stone fireplace, and panoramic mist views in Munnar."}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePhotoModal(null)}
                  style={{
                    padding: "6px 16px",
                    background: "#142217",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default Booking;