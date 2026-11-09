import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchDashboardStats,
  fetchRooms,
  createRoom,
  updateRoom,
  toggleRoomStatus,
  deleteRoom,
  fetchEnquiries,
  replyToEnquiry,
  deleteEnquiry,
  fetchAllBookings,
  checkInGuest,
  checkOutGuest,
  cancelBooking,
  fetchAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
  fetchAdminReviews,
  moderateReviewStatus,
  deleteReview,
} from "../../api/adminApi";
import { logoutUser } from "../../api/authApi";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  // Active view: "all" or specific section
  const [activeSection, setActiveSection] = useState("all");

  // Admin Profile State
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
    maintenanceRooms: 0,
    occupancyRate: 0,
    totalEnquiries: 0,
    newEnquiries: 0,
    repliedEnquiries: 0,
  });

  // Rooms State
  const [rooms, setRooms] = useState([]);
  const [roomFilter, setRoomFilter] = useState("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("all");
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingsPerPage, setBookingsPerPage] = useState(5);

  // Revenue Filter State
  const [revenuePeriodFilter, setRevenuePeriodFilter] = useState("all"); // "all", "today", "this_week", "this_month", "this_year"
  const [revenueStatusFilter, setRevenueStatusFilter] = useState("valid"); // "valid" (active/completed), "completed", "all"

  // Admin Profile Handled Operations Tab
  const [adminOpsTab, setAdminOpsTab] = useState("all"); // "all", "bookings", "enquiries", "reviews"

  // Enquiries State
  const [enquiries, setEnquiries] = useState([]);
  const [enquiryFilter, setEnquiryFilter] = useState("all");
  const [enquirySearch, setEnquirySearch] = useState("");
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);

  // Reviews State (Module 8)
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Location Filter State
  const [locationFilter, setLocationFilter] = useState("all");

  // Add Room Modal State
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    roomNumber: "",
    name: "",
    location: "Maldives Horizon Coast",
    totalRooms: 4,
    category: "Ocean View Suite",
    pricePerNight: "",
    capacity: 4,
    status: "available",
    image: "/images/viceroy-bedroom.jpg",
    amenities: "Ocean View, 4 Luxury Rooms, King Beds, Wi-Fi, Breakfast Included",
    description: "",
  });

  // Edit / Update Suite Modal State
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [submittingEditRoom, setSubmittingEditRoom] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editRoomForm, setEditRoomForm] = useState({
    roomNumber: "",
    name: "",
    location: "Maldives Horizon Coast",
    totalRooms: 4,
    category: "Ocean View Suite",
    pricePerNight: "",
    capacity: 4,
    status: "available",
    image: "/images/viceroy-bedroom.jpg",
    amenities: "",
    description: "",
  });

  // Reply Enquiry Modal State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Profile Photo & Edit Forms State
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(adminUser?.profilePhoto || "");

  const [profileForm, setProfileForm] = useState({
    fullName: adminUser?.fullName || "",
    email: adminUser?.email || "",
    profilePhoto: adminUser?.profilePhoto || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Fetch Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchDashboardStats();
      if (data) setStats(data);
    } catch (err) {
      console.error("Failed to load statistics:", err.message);
    }
  }, []);

  // 2. Fetch Rooms
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const data = await fetchRooms({
        status: roomFilter,
        search: roomSearch,
      });
      setRooms(data);
    } catch (err) {
      showToast("Error loading rooms: " + err.message);
    } finally {
      setLoadingRooms(false);
    }
  }, [roomFilter, roomSearch]);

  // 3. Fetch Bookings
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const data = await fetchAllBookings();
      setBookings(data || []);
    } catch (err) {
      console.error("Error loading bookings:", err.message);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // 4. Fetch Enquiries
  const loadEnquiries = useCallback(async () => {
    setLoadingEnquiries(true);
    try {
      const data = await fetchEnquiries({
        status: enquiryFilter,
        search: enquirySearch,
      });
      setEnquiries(data.enquiries || []);
    } catch (err) {
      showToast("Error loading enquiries: " + err.message);
    } finally {
      setLoadingEnquiries(false);
    }
  }, [enquiryFilter, enquirySearch]);

  // 5. Fetch Reviews
  const loadReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const data = await fetchAdminReviews();
      setReviews(data || []);
    } catch (err) {
      console.warn("Could not load reviews for moderation:", err.message);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  // 6. Fetch Profile
  const loadProfile = useCallback(async () => {
    try {
      const user = await fetchAdminProfile();
      if (user) {
        setAdminUser(user);
        setProfileForm({
          fullName: user.fullName || "",
          email: user.email || "",
          profilePhoto: user.profilePhoto || "",
        });
        setPhotoPreview(user.profilePhoto || "");
        localStorage.setItem("user", JSON.stringify(user));
      }
    } catch (err) {
      console.warn("Could not fetch latest profile:", err.message);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadRooms();
    loadBookings();
    loadEnquiries();
    loadReviews();
    loadProfile();
  }, [loadStats, loadRooms, loadBookings, loadEnquiries, loadReviews, loadProfile]);

  // Handle Logout
  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  // Add Room Submit
  const handleAddRoomSubmit = async (e) => {
    e.preventDefault();
    if (!newRoomForm.roomNumber || !newRoomForm.name || !newRoomForm.pricePerNight) {
      showToast("Please enter Room Number, Suite Name, and Price per Night.");
      return;
    }

    setSubmittingRoom(true);
    try {
      await createRoom({
        ...newRoomForm,
        location: newRoomForm.location?.trim() || "Maldives Horizon Coast",
        totalRooms: Number(newRoomForm.totalRooms) || 4,
        pricePerNight: Number(newRoomForm.pricePerNight),
        capacity: Number(newRoomForm.capacity) || 4,
      });
      showToast(`Suite ${newRoomForm.roomNumber} (${newRoomForm.name}) added to inventory and published across all website pages!`);
      setIsAddRoomOpen(false);
      setNewRoomForm({
        roomNumber: "",
        name: "",
        location: "Maldives Horizon Coast",
        totalRooms: 4,
        category: "Ocean View Suite",
        pricePerNight: "",
        capacity: 4,
        status: "available",
        image: "/images/viceroy-bedroom.jpg",
        amenities: "Ocean View, 4 Luxury Rooms, King Beds, Wi-Fi, Breakfast Included",
        description: "",
      });
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to add suite: " + err.message);
    } finally {
      setSubmittingRoom(false);
    }
  };

  // Open Edit / Update Room Modal
  const handleOpenEditRoom = (room) => {
    setEditingRoomId(room._id);
    setEditRoomForm({
      roomNumber: room.roomNumber || "",
      name: room.name || "",
      location: room.location || "Maldives Horizon Coast",
      totalRooms: room.totalRooms || 4,
      category: room.category || "Ocean View Suite",
      pricePerNight: room.pricePerNight || "",
      capacity: room.capacity || 4,
      status: room.status || "available",
      image: room.image || "/images/home1.png",
      amenities: Array.isArray(room.amenities)
        ? room.amenities.join(", ")
        : room.amenities || "",
      description: room.description || "",
    });
    setIsEditRoomOpen(true);
  };

  // Submit Edit / Update Room (Syncs to MongoDB and updates entire website)
  const handleEditRoomSubmit = async (e) => {
    e.preventDefault();
    if (!editRoomForm.roomNumber || !editRoomForm.name || !editRoomForm.pricePerNight) {
      showToast("Please enter Suite Number, Name, and Price per Night.");
      return;
    }

    setSubmittingEditRoom(true);
    try {
      await updateRoom(editingRoomId, {
        ...editRoomForm,
        location: editRoomForm.location?.trim() || "Maldives Horizon Coast",
        totalRooms: Number(editRoomForm.totalRooms) || 4,
        pricePerNight: Number(editRoomForm.pricePerNight),
        capacity: Number(editRoomForm.capacity) || 4,
      });
      showToast(`Suite ${editRoomForm.roomNumber} (${editRoomForm.name}) updated successfully! Changes are live across the entire website.`);
      setIsEditRoomOpen(false);
      setEditingRoomId(null);
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to update suite: " + err.message);
    } finally {
      setSubmittingEditRoom(false);
    }
  };

  // Toggle Room Status (Available <-> Booked)
  const handleToggleRoomStatus = async (id, currentStatus) => {
    const targetStatus = currentStatus === "available" ? "booked" : "available";
    try {
      await toggleRoomStatus(id, targetStatus);
      showToast(`Room marked as ${targetStatus}`);
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to toggle status: " + err.message);
    }
  };

  // Remove Room
  const handleDeleteRoom = async (id, roomNumber, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove Suite ${roomNumber} (${name})? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await deleteRoom(id);
      showToast(`Suite ${roomNumber} deleted successfully.`);
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to delete room: " + err.message);
    }
  };

  // Check-In Guest Action (Module 11)
  const handleCheckInGuest = async (bookingId, guestName) => {
    try {
      await checkInGuest(bookingId);
      showToast(`Guest ${guestName} checked in successfully!`);
      loadBookings();
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to check in: " + err.message);
    }
  };

  // Check-Out Guest Action (Module 11)
  const handleCheckOutGuest = async (bookingId, guestName) => {
    try {
      await checkOutGuest(bookingId);
      showToast(`Guest ${guestName} checked out. Suite is now available.`);
      loadBookings();
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to check out: " + err.message);
    }
  };

  // Cancel Booking Action (Module 10)
  const handleAdminCancelBooking = async (bookingId, ref) => {
    const confirmCancel = window.confirm(
      `Cancel reservation #${ref} and initiate refund?`
    );
    if (!confirmCancel) return;

    try {
      await cancelBooking(bookingId, "Cancelled by administrator");
      showToast(`Booking #${ref} has been cancelled.`);
      loadBookings();
      loadRooms();
      loadStats();
    } catch (err) {
      showToast("Failed to cancel: " + err.message);
    }
  };

  // Open Reply Modal
  const handleOpenReplyModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setReplySubject(
      enquiry.replySubject ||
        `Regarding your inquiry at Viceroy Resort - ${enquiry.suitePreference}`
    );
    setReplyMessage(
      enquiry.replyMessage ||
        `Dear ${enquiry.firstName},\n\nThank you for reaching out to Viceroy Resort. We are delighted to confirm that we have availability for the ${enquiry.suitePreference} and would be thrilled to welcome you.\n\nPlease let us know if you have any additional requests so we may assist you with your reservation.\n\nWarm regards,\nViceroy Concierge Team`
    );
    setReplyModalOpen(true);
  };

  // Send Reply Email
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      showToast("Please enter a reply message.");
      return;
    }

    setSendingReply(true);
    try {
      const res = await replyToEnquiry(selectedEnquiry._id, {
        replySubject,
        replyMessage,
      });

      showToast(res.message || "Reply sent to customer via email!");
      setReplyModalOpen(false);
      loadEnquiries();
      loadStats();
    } catch (err) {
      showToast("Failed to send reply: " + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async (id, guestName) => {
    const confirmDelete = window.confirm(`Delete inquiry from ${guestName}?`);
    if (!confirmDelete) return;

    try {
      await deleteEnquiry(id);
      showToast("Enquiry deleted.");
      loadEnquiries();
      loadStats();
    } catch (err) {
      showToast("Failed to delete enquiry: " + err.message);
    }
  };

  // Moderate Review Status (published / hidden)
  const handleToggleReviewStatus = async (reviewId, currentStatus) => {
    const nextStatus = currentStatus === "published" ? "hidden" : "published";
    try {
      await moderateReviewStatus(reviewId, nextStatus);
      showToast(`Review marked as ${nextStatus}`);
      loadReviews();
    } catch (err) {
      showToast("Failed to update review status: " + err.message);
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId) => {
    const confirmDel = window.confirm("Delete this customer review permanently?");
    if (!confirmDel) return;

    try {
      await deleteReview(reviewId);
      showToast("Review deleted.");
      loadReviews();
    } catch (err) {
      showToast("Failed to delete review: " + err.message);
    }
  };

  // Update Profile Name/Email/Photo
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateAdminProfile(profileForm);
      setAdminUser(res.user);
      setPhotoPreview(res.user?.profilePhoto || "");
      localStorage.setItem("user", JSON.stringify(res.user));
      showToast("Admin profile details updated successfully!");
    } catch (err) {
      showToast("Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Profile Photo Upload Handlers
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (e.g. JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Selected image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setPhotoPreview(base64Data);
      setProfileForm((prev) => ({ ...prev, profilePhoto: base64Data }));

      // Auto-save the uploaded photo immediately
      try {
        setUploadingPhoto(true);
        const res = await updateAdminProfile({
          fullName: profileForm.fullName || adminUser?.fullName,
          email: profileForm.email || adminUser?.email,
          profilePhoto: base64Data,
        });
        setAdminUser(res.user);
        localStorage.setItem("user", JSON.stringify(res.user));
        showToast("Admin profile photo updated successfully!");
      } catch (err) {
        showToast("Failed to upload photo: " + err.message);
      } finally {
        setUploadingPhoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New password and confirmation do not match.");
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
      showToast("Failed to update password: " + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter === "all") return true;
    return b.status === bookingStatusFilter;
  });

  // Dynamic Revenue Calculation with Period & Status Filtering
  const revenueData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(now);
    const dayOfWeek = (now.getDay() + 6) % 7;
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const matchingBookings = bookings.filter((b) => {
      // 1. Status Filter
      if (revenueStatusFilter === "valid" && b.status === "cancelled") return false;
      if (revenueStatusFilter === "completed" && b.status !== "checked-out") return false;

      // 2. Period Filter
      const dateVal = b.createdAt ? new Date(b.createdAt) : (b.checkIn ? new Date(b.checkIn) : null);
      if (!dateVal || isNaN(dateVal.getTime())) return true;

      if (revenuePeriodFilter === "today") return dateVal >= startOfToday;
      if (revenuePeriodFilter === "this_week") return dateVal >= startOfWeek;
      if (revenuePeriodFilter === "this_month") return dateVal >= startOfMonth;
      if (revenuePeriodFilter === "this_year") return dateVal >= startOfYear;
      return true;
    });

    const total = matchingBookings.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
    const count = matchingBookings.length;
    const avg = count > 0 ? Math.round(total / count) : 0;

    return { total, count, avg };
  }, [bookings, revenuePeriodFilter, revenueStatusFilter]);

  const filteredBookingsRevenue = useMemo(() => {
    return filteredBookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);
  }, [filteredBookings]);

  // Admin Handled Operations Statistics
  const adminOpsStats = useMemo(() => {
    const totalHandled = bookings.length;
    const checkInsHandled = bookings.filter((b) => b.status === "checked-in" || b.status === "checked-out").length;
    const checkOutsCompleted = bookings.filter((b) => b.status === "checked-out").length;
    const activeConfirmed = bookings.filter((b) => b.status === "confirmed").length;
    const cancelledHandled = bookings.filter((b) => b.status === "cancelled").length;
    const enquiriesResolved = stats.repliedEnquiries || 0;
    const reviewsModerated = reviews.length;
    const publishedReviews = reviews.filter((r) => r.status === "published").length;
    const revenueHandled = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

    return {
      totalHandled,
      checkInsHandled,
      checkOutsCompleted,
      activeConfirmed,
      cancelledHandled,
      enquiriesResolved,
      reviewsModerated,
      publishedReviews,
      revenueHandled,
    };
  }, [bookings, stats, reviews]);

  const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / bookingsPerPage));
  const currentBookingPage = Math.min(Math.max(1, bookingPage), totalBookingPages);
  const bookingStartIndex = (currentBookingPage - 1) * bookingsPerPage;
  const bookingEndIndex = Math.min(bookingStartIndex + bookingsPerPage, filteredBookings.length);
  const paginatedBookings = filteredBookings.slice(bookingStartIndex, bookingStartIndex + bookingsPerPage);

  const renderBookingPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalBookingPages <= maxVisiblePages) {
      for (let i = 1; i <= totalBookingPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentBookingPage - 2);
      let endPage = Math.min(totalBookingPages, currentBookingPage + 2);

      if (currentBookingPage <= 3) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (currentBookingPage >= totalBookingPages - 2) {
        startPage = totalBookingPages - maxVisiblePages + 1;
        endPage = totalBookingPages;
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalBookingPages) {
        if (endPage < totalBookingPages - 1) pages.push("...");
        pages.push(totalBookingPages);
      }
    }

    return pages.map((page, idx) => {
      if (page === "...") {
        return (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
            …
          </span>
        );
      }
      return (
        <button
          key={page}
          type="button"
          className={`pagination-btn ${currentBookingPage === page ? "active" : ""}`}
          onClick={() => setBookingPage(page)}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="admin-layout">
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-brand">
          <Link to="/admin" className="brand-crest">
            VICEROY<span>.</span>
          </Link>
          <span className="admin-badge">ADMIN PORTAL</span>
        </div>

        <div className="admin-nav-actions">
          <div className="admin-user-info" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="admin-nav-avatar">
              {(photoPreview || adminUser?.profilePhoto) ? (
                <img
                  src={photoPreview || adminUser?.profilePhoto}
                  alt={adminUser?.fullName || "Admin"}
                  className="admin-nav-avatar-img"
                />
              ) : (
                <span>
                  {adminUser?.fullName ? adminUser.fullName.charAt(0).toUpperCase() : "A"}
                </span>
              )}
            </div>
            <span>
              Signed in as: <strong>{adminUser?.fullName || "Administrator"}</strong>
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="admin-container">
        {/* Welcome & Overview Header */}
        <div className="admin-stats-header">
          <div>
            <h1>Resort Operations Dashboard</h1>
            <p>
              Complete administration for Room Management, Booking History, Check-ins, Enquiries, and Profile Settings.
            </p>
          </div>
        </div>

        {/* METRICS STRIP: REVENUE, ROOMS & BOOKINGS */}
        <section className="stats-grid">
          {/* TOTAL REVENUE STAT CARD WITH FILTER */}
          <div className="stat-card card-revenue">
            <div className="stat-label">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span>💰 Total Revenue</span>
              </span>
              <div className="revenue-filter-controls">
                <select
                  value={revenuePeriodFilter}
                  onChange={(e) => setRevenuePeriodFilter(e.target.value)}
                  className="revenue-select"
                  title="Filter revenue by time period"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </select>
              </div>
            </div>

            <div className="stat-value" style={{ color: "var(--admin-gold)" }}>
              ₹{revenueData.total.toLocaleString("en-IN")}
            </div>

            <div className="stat-subtext" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
              <span>
                <strong>{revenueData.count}</strong> {revenueData.count === 1 ? "booking" : "bookings"}
                {revenueData.count > 0 && ` · Avg ₹${revenueData.avg.toLocaleString("en-IN")}`}
              </span>
              <span className="revenue-status-toggle">
                <button
                  type="button"
                  className={`btn-rev-status ${revenueStatusFilter === "valid" ? "active" : ""}`}
                  onClick={() => setRevenueStatusFilter("valid")}
                  title="Active: Confirmed, In-House & Completed"
                >
                  Active
                </button>
                <button
                  type="button"
                  className={`btn-rev-status ${revenueStatusFilter === "completed" ? "active" : ""}`}
                  onClick={() => setRevenueStatusFilter("completed")}
                  title="Completed / Checked-Out Only"
                >
                  Completed
                </button>
                <button
                  type="button"
                  className={`btn-rev-status ${revenueStatusFilter === "all" ? "active" : ""}`}
                  onClick={() => setRevenueStatusFilter("all")}
                  title="All Bookings (Including Cancelled)"
                >
                  All
                </button>
              </span>
            </div>
          </div>

          {/* AVAILABLE ROOMS */}
          <div className="stat-card card-available">
            <div className="stat-label">
              <span>Available Rooms</span>
              <span style={{ color: "var(--admin-green)", fontSize: "14px" }}>● Ready</span>
            </div>
            <div className="stat-value" style={{ color: "var(--admin-green)" }}>
              {stats.availableRooms} <small style={{ fontSize: "13px", color: "#555" }}>/ {stats.totalRooms} Rooms</small>
            </div>
            <div className="stat-subtext">
              {stats.availableSuites !== undefined
                ? `${stats.availableSuites} suites open for booking`
                : "Rooms ready for immediate guest reservations"}
            </div>
          </div>

          {/* BOOKED ROOMS */}
          <div className="stat-card card-booked">
            <div className="stat-label">
              <span>Booked Rooms</span>
              <span style={{ color: "#c95d32", fontSize: "14px" }}>● Occupied</span>
            </div>
            <div className="stat-value" style={{ color: "#c95d32" }}>
              {stats.bookedRooms}
            </div>
            <div className="stat-subtext">
              Rooms currently reserved or checked-in
            </div>
          </div>

          {/* TOTAL INVENTORY */}
          <div className="stat-card card-total">
            <div className="stat-label">
              <span>Total Inventory</span>
              <span>🏨</span>
            </div>
            <div className="stat-value">{stats.totalRooms} <span style={{ fontSize: "14px" }}>Rooms</span></div>
            <div className="stat-subtext">
              {rooms.length} Suites · Occupancy: {stats.occupancyRate}%
            </div>
            <div className="occupancy-bar-container">
              <div
                className="occupancy-bar-fill"
                style={{ width: `${stats.occupancyRate}%` }}
              />
            </div>
          </div>

          {/* TOTAL BOOKINGS */}
          <div className="stat-card card-bookings">
            <div className="stat-label">
              <span>Confirmed Bookings</span>
              <span>📅 History</span>
            </div>
            <div className="stat-value" style={{ color: "#2b6cb0" }}>
              {bookings.length}
            </div>
            <div className="stat-subtext">
              Total reservations on record
            </div>
          </div>

          {/* PENDING ENQUIRIES */}
          <div className="stat-card card-enquiries">
            <div className="stat-label">
              <span>Pending Inquiries</span>
              <span style={{ color: "var(--admin-gold)" }}>✉️ Action Needed</span>
            </div>
            <div className="stat-value" style={{ color: "#9c4c16" }}>
              {stats.newEnquiries}
            </div>
            <div className="stat-subtext">
              {stats.newEnquiries === 0
                ? "All inquiries answered"
                : `${stats.newEnquiries} awaiting concierge reply`}
            </div>
          </div>
        </section>

        {/* QUICK JUMP / VIEW NAVIGATION (VIEW ALL IN ONE PAGE OR JUMP TO SECTION) */}
        <nav className="quick-jump-nav" aria-label="Admin Navigation">
          <button
            className={`jump-link-btn ${activeSection === "all" ? "active" : ""}`}
            onClick={() => setActiveSection("all")}
          >
            🌟 View All On One Page
          </button>
          <button
            className={`jump-link-btn ${activeSection === "rooms" ? "active" : ""}`}
            onClick={() => setActiveSection("rooms")}
          >
            🛏️ Rooms (Add & Remove) ({stats.totalRooms})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "bookings" ? "active" : ""}`}
            onClick={() => setActiveSection("bookings")}
          >
            📅 Booking History ({bookings.length})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "enquiries" ? "active" : ""}`}
            onClick={() => setActiveSection("enquiries")}
          >
            📩 Enquiry List ({stats.totalEnquiries})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "reviews" ? "active" : ""}`}
            onClick={() => setActiveSection("reviews")}
          >
            ⭐ Reviews ({reviews.length})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "profile" ? "active" : ""}`}
            onClick={() => setActiveSection("profile")}
          >
            👤 Admin Profile
          </button>
        </nav>

        {/* ============================================================== */}
        {/* 1. ROOMS MANAGEMENT SECTION (ADD & REMOVE ROOMS)                */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "rooms") && (
          <section className="admin-section-block" id="rooms">
            <div className="section-title-row">
              <div>
                <h2>🛏️ Suites & Residences Inventory (Add & Edit Suites)</h2>
                <p>
                  Manage Viceroy suites across all locations (each suite with 4 rooms). Add new suites or edit existing details to update the entire website live.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search suite title, number, location..."
                  className="search-input"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                />
                <button
                  onClick={() => setIsAddRoomOpen(true)}
                  className="btn-primary-action"
                >
                  + Add New Suite
                </button>
              </div>
            </div>

            {/* Filter Pills (Status & Location) */}
            <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="filter-group">
                <button
                  className={`filter-pill ${roomFilter === "all" ? "active" : ""}`}
                  onClick={() => setRoomFilter("all")}
                >
                  All Suites ({stats.totalRooms})
                </button>
                <button
                  className={`filter-pill ${roomFilter === "available" ? "active" : ""}`}
                  onClick={() => setRoomFilter("available")}
                >
                  🟢 Available Only ({stats.availableRooms})
                </button>
                <button
                  className={`filter-pill ${roomFilter === "booked" ? "active" : ""}`}
                  onClick={() => setRoomFilter("booked")}
                >
                  🔴 Booked Only ({stats.bookedRooms})
                </button>
              </div>

              {/* Location Filter Pills */}
              <div className="filter-group" style={{ flexWrap: "wrap" }}>
                <button
                  className={`filter-pill ${locationFilter === "all" ? "active" : ""}`}
                  onClick={() => setLocationFilter("all")}
                  style={{ background: locationFilter === "all" ? "#c49d68" : "", color: locationFilter === "all" ? "#fff" : "" }}
                >
                  📍 All Locations ({rooms.length})
                </button>
                {Array.from(new Set(rooms.map((r) => r.location).filter(Boolean))).map((loc) => (
                  <button
                    key={loc}
                    className={`filter-pill ${locationFilter === loc ? "active" : ""}`}
                    onClick={() => setLocationFilter(loc)}
                    style={{ background: locationFilter === loc ? "#c49d68" : "", color: locationFilter === loc ? "#fff" : "" }}
                  >
                    📍 {loc} ({rooms.filter((r) => r.location === loc).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Room Cards Grid */}
            {loadingRooms ? (
              <div className="empty-state-box">
                <p>Loading suites inventory...</p>
              </div>
            ) : rooms.filter((r) => locationFilter === "all" || r.location === locationFilter).length === 0 ? (
              <div className="empty-state-box">
                <h3>No suites found</h3>
                <p>No rooms match your filter. You can add a new room below.</p>
                <button
                  onClick={() => setIsAddRoomOpen(true)}
                  className="btn-primary-action"
                  style={{ margin: "16px auto 0" }}
                >
                  + Add New Suite
                </button>
              </div>
            ) : (
              <div className="rooms-grid">
                {rooms
                  .filter((r) => locationFilter === "all" || r.location === locationFilter)
                  .map((room) => {
                    const totalRooms = Number(room.totalRooms) || 4;
                    const bookedRoomsCount = Number(room.bookedRoomsCount) || 0;
                    const freeRoomsCount =
                      room.freeRoomsCount !== undefined
                        ? Number(room.freeRoomsCount)
                        : Math.max(0, totalRooms - bookedRoomsCount);

                    const base = (room.roomNumber || "101").trim().toUpperCase();
                    const allRoomNumbers =
                      Array.isArray(room.roomNumbers) && room.roomNumbers.length >= totalRooms
                        ? room.roomNumbers.slice(0, totalRooms)
                        : Array.from({ length: totalRooms }, (_, i) => `${base}-${i + 1}`);

                    const bookedRoomNumbers = room.bookedRoomNumbers || [];
                    const availableRoomNumbers =
                      room.availableRoomNumbers ||
                      allRoomNumbers.filter((rn) => !bookedRoomNumbers.includes(rn));

                    const isAvailable = freeRoomsCount > 0 && room.status !== "maintenance";
                    const isFullyBooked = freeRoomsCount === 0 || room.status === "booked";
                    const isPartiallyBooked = bookedRoomsCount > 0 && freeRoomsCount > 0;

                    return (
                      <article key={room._id} className="room-card">
                        <div className="room-image-wrap">
                          <img
                            src={room.image || "/images/home1.png"}
                            alt={room.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "/images/home1.png";
                            }}
                          />
                          <div className="room-number-pill">
                            SUITE {room.roomNumber}
                          </div>
                          <div
                            className={`room-status-badge ${
                              room.status === "maintenance"
                                ? "status-maintenance"
                                : isFullyBooked
                                ? "status-booked"
                                : isPartiallyBooked
                                ? "status-booked"
                                : "status-available"
                            }`}
                            style={{
                              background: isFullyBooked ? "#fee2e2" : isPartiallyBooked ? "#fef3c7" : "#dcfce7",
                              color: isFullyBooked ? "#991b1b" : isPartiallyBooked ? "#92400e" : "#166534",
                              border: isFullyBooked ? "1px solid #f87171" : isPartiallyBooked ? "1px solid #fcd34d" : "1px solid #86efac",
                            }}
                          >
                            {room.status === "maintenance"
                              ? "Maintenance"
                              : isFullyBooked
                              ? "Fully Booked"
                              : isPartiallyBooked
                              ? `Partial (${freeRoomsCount} Free)`
                              : "Available"}
                          </div>
                        </div>

                        <div className="room-content">
                          {/* Location & Room Count Tag */}
                          <div className="room-location-tag">
                            <span>📍 {room.location || "Maldives Horizon Coast"}</span>
                            <span className="room-rooms-badge">🚪 {totalRooms} Rooms Suite</span>
                          </div>

                          <div className="room-category">{room.category}</div>
                          <h3 className="room-title">{room.name}</h3>

                          {/* Booked and Available Room Numbers Breakdown */}
                          <div
                            style={{
                              margin: "12px 0",
                              padding: "10px 12px",
                              background: "#fbf9f5",
                              border: "1px solid #ebd8c0",
                              borderRadius: "6px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "6px",
                              }}
                            >
                              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#142217" }}>
                                🚪 Total Rooms: {totalRooms}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  color: isFullyBooked ? "#a82e2e" : isPartiallyBooked ? "#b45309" : "#15803d",
                                }}
                              >
                                {isFullyBooked
                                  ? "All rooms occupied"
                                  : `${freeRoomsCount} of ${totalRooms} rooms available`}
                              </span>
                            </div>

                            {/* Booked Rooms Numbers */}
                            <div style={{ fontSize: "11px", marginBottom: "5px" }}>
                              <strong style={{ color: "#c95d32" }}>
                                🔴 Booked Rooms ({bookedRoomsCount}):{" "}
                              </strong>
                              {bookedRoomNumbers.length > 0 ? (
                                bookedRoomNumbers.map((rn) => (
                                  <span
                                    key={rn}
                                    style={{
                                      display: "inline-block",
                                      padding: "1px 6px",
                                      background: "#fee2e2",
                                      color: "#991b1b",
                                      borderRadius: "4px",
                                      fontWeight: "bold",
                                      marginRight: "4px",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {rn}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: "#888" }}>None (0 booked)</span>
                              )}
                            </div>

                            {/* Available Rooms Numbers */}
                            <div style={{ fontSize: "11px" }}>
                              <strong style={{ color: "#1f7a3f" }}>
                                🟢 Available Rooms ({freeRoomsCount}):{" "}
                              </strong>
                              {availableRoomNumbers.length > 0 ? (
                                availableRoomNumbers.map((rn) => (
                                  <span
                                    key={rn}
                                    style={{
                                      display: "inline-block",
                                      padding: "1px 6px",
                                      background: "#dcfce7",
                                      color: "#166534",
                                      borderRadius: "4px",
                                      fontWeight: "bold",
                                      marginRight: "4px",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {rn}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: "#888" }}>None (0 available)</span>
                              )}
                            </div>

                            {/* Visual Individual Room Slots */}
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                marginTop: "8px",
                                flexWrap: "wrap",
                                borderTop: "1px dashed #e2dad0",
                                paddingTop: "6px",
                              }}
                            >
                              {allRoomNumbers.map((rn) => {
                                const isRoomBooked = bookedRoomNumbers.includes(rn);
                                return (
                                  <span
                                    key={rn}
                                    style={{
                                      fontSize: "10px",
                                      padding: "2px 6px",
                                      borderRadius: "3px",
                                      border: isRoomBooked
                                        ? "1px solid #fca5a5"
                                        : "1px solid #86efac",
                                      background: isRoomBooked ? "#fff5f5" : "#f0fdf4",
                                      color: isRoomBooked ? "#b91c1c" : "#15803d",
                                      fontWeight: "600",
                                    }}
                                    title={isRoomBooked ? `Room ${rn} is Booked` : `Room ${rn} is Available`}
                                  >
                                    Room {rn} {isRoomBooked ? "🔴" : "🟢"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="room-details-row">
                            <div className="room-price">
                              ₹{room.pricePerNight?.toLocaleString("en-IN")}{" "}
                              <span>/ night</span>
                            </div>
                            <div className="room-capacity">
                              👤 Up to {room.capacity || 4} Guests
                            </div>
                          </div>

                          <div className="room-amenities">
                            {(room.amenities || []).slice(0, 3).map((amenity, idx) => (
                              <span key={idx} className="amenity-chip">
                                ✓ {amenity}
                              </span>
                            ))}
                          </div>

                          <div className="room-actions">
                            <button
                              onClick={() => handleOpenEditRoom(room)}
                              className="btn-edit-room"
                              title="Edit and update suite details across the website"
                            >
                              ✏️ Edit Suite
                            </button>

                            <button
                              onClick={() =>
                                handleToggleRoomStatus(room._id, room.status)
                              }
                              className={`btn-toggle-status ${
                                isAvailable ? "mark-booked" : "mark-available"
                              }`}
                              title="Toggle room status"
                            >
                              {isAvailable ? "Mark as Booked" : "Mark as Available"}
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteRoom(room._id, room.roomNumber, room.name)
                              }
                              className="btn-delete-room"
                              title="Remove suite permanently"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 2. BOOKING HISTORY & CHECK-IN / CHECK-OUT SECTION             */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "bookings") && (
          <section className="admin-section-block" id="bookings">
            <div className="section-title-row">
              <div>
                <h2>📅 Booking History & Operations (Check-In / Check-Out)</h2>
                <p>
                  Manage guest stays, arrival check-in, departure check-out, and cancellation tracking.
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <div className="booking-rev-badge" title="Total revenue for current booking filter">
                  <span>Filtered Revenue:</span>
                  <strong>₹{filteredBookingsRevenue.toLocaleString("en-IN")}</strong>
                </div>

                <button
                  className={`filter-pill ${bookingStatusFilter === "all" ? "active" : ""}`}
                  onClick={() => {
                    setBookingStatusFilter("all");
                    setBookingPage(1);
                  }}
                >
                  All ({bookings.length})
                </button>
                <button
                  className={`filter-pill ${bookingStatusFilter === "confirmed" ? "active" : ""}`}
                  onClick={() => {
                    setBookingStatusFilter("confirmed");
                    setBookingPage(1);
                  }}
                >
                  Confirmed
                </button>
                <button
                  className={`filter-pill ${bookingStatusFilter === "checked-in" ? "active" : ""}`}
                  onClick={() => {
                    setBookingStatusFilter("checked-in");
                    setBookingPage(1);
                  }}
                >
                  Checked-In
                </button>
                <button
                  className={`filter-pill ${bookingStatusFilter === "checked-out" ? "active" : ""}`}
                  onClick={() => {
                    setBookingStatusFilter("checked-out");
                    setBookingPage(1);
                  }}
                >
                  Completed
                </button>
              </div>
            </div>

            {loadingBookings ? (
              <div className="empty-state-box">
                <p>Loading booking history...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="empty-state-box">
                <h3>No Bookings Recorded</h3>
                <p>No reservations match this status.</p>
              </div>
            ) : (
              <>
                <div className="enquiries-list">
                  {paginatedBookings.map((b) => (
                  <article key={b._id} className="booking-history-card">
                    <div className="booking-header-line">
                      <div>
                        <span className="booking-ref-badge">
                          REF #{b.bookingReference}
                        </span>
                        <span style={{ marginLeft: "10px", fontSize: "14px", fontWeight: "bold", color: "#142217" }}>
                          {b.roomName} {b.roomCategory ? `(${b.roomCategory})` : ""} · Suite(s) {b.roomNumber || "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className={`status-pill-badge ${b.status}`}>
                          {b.status}
                        </span>
                        <strong style={{ fontSize: "16px", color: "#142217" }}>
                          ₹{b.totalPrice?.toLocaleString("en-IN")}
                        </strong>
                      </div>
                    </div>

                    {/* Booked Suites & Booked Room Numbers */}
                    {Array.isArray(b.suites) && b.suites.length > 0 ? (
                      <div
                        style={{
                          margin: "10px 0",
                          padding: "10px 14px",
                          background: "#faf7f2",
                          border: "1px solid #e8decb",
                          borderRadius: "4px",
                        }}
                      >
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#8c6f44", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                          Booked Suites & Assigned Room Numbers:
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {b.suites.map((s, sIdx) => (
                            <div key={sIdx} style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span>
                                🏛️ <strong>{s.roomName}</strong> (Suite {s.roomNumber}) — {s.roomsCount} Room{s.roomsCount > 1 ? "s" : ""}:
                              </span>
                              <div style={{ display: "inline-flex", gap: "4px" }}>
                                {s.allocatedRoomNumbers && s.allocatedRoomNumbers.length > 0 ? (
                                  s.allocatedRoomNumbers.map((rn) => (
                                    <span
                                      key={rn}
                                      style={{
                                        background: "#fee2e2",
                                        color: "#991b1b",
                                        padding: "1px 6px",
                                        borderRadius: "3px",
                                        fontWeight: "bold",
                                        fontSize: "12px",
                                        border: "1px solid #fca5a5",
                                      }}
                                    >
                                      Room {rn}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: "#c95d32", fontWeight: "bold" }}>
                                    Room {s.roomNumber}-1
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          margin: "8px 0",
                          padding: "8px 12px",
                          background: "#faf7f2",
                          border: "1px solid #e8decb",
                          borderRadius: "4px",
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          🏛️ <strong>Suite {b.roomNumber}:</strong> {b.roomsCount || 1} Room(s) Booked —
                        </span>
                        <div style={{ display: "inline-flex", gap: "4px" }}>
                          {b.allocatedRoomNumbers && b.allocatedRoomNumbers.length > 0 ? (
                            b.allocatedRoomNumbers.map((rn) => (
                              <span
                                key={rn}
                                style={{
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  padding: "1px 6px",
                                  borderRadius: "3px",
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                  border: "1px solid #fca5a5",
                                }}
                              >
                                Room {rn}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "#c95d32", fontWeight: "bold" }}>
                              Room {b.roomNumber || "101-1"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="booking-info-grid">
                      <div className="booking-info-item">
                        <label>Primary Guest</label>
                        <strong>{b.guestName}</strong>
                      </div>

                      <div className="booking-info-item">
                        <label>Guest Email</label>
                        <a href={`mailto:${b.guestEmail}`} style={{ color: "#142217" }}>{b.guestEmail}</a>
                      </div>

                      {b.guestPhone && (
                        <div className="booking-info-item">
                          <label>Contact Phone</label>
                          <span>{b.guestPhone}</span>
                        </div>
                      )}

                      <div className="booking-info-item">
                        <label>Check-In Date</label>
                        <strong>
                          {new Date(b.checkIn).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </strong>
                      </div>

                      <div className="booking-info-item">
                        <label>Check-Out Date</label>
                        <strong>
                          {new Date(b.checkOut).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </strong>
                      </div>

                      <div className="booking-info-item">
                        <label>Party & Duration</label>
                        <span>{b.nights} Night(s) · {b.guests} Guest(s)</span>
                      </div>

                      <div className="booking-info-item">
                        <label>Payment Method & Status</label>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ color: b.paymentMethod === "Razorpay" ? "#0d6efd" : "#142217" }}>
                            {b.paymentMethod || "Razorpay"}
                          </strong>
                          <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "3px", fontWeight: "bold", background: b.paymentStatus === "Paid" ? "#d1fae5" : "#fef3c7", color: b.paymentStatus === "Paid" ? "#065f46" : "#92400e" }}>
                            {b.paymentStatus || "Paid"}
                          </span>
                        </span>
                        {(b.razorpayPaymentId || b.transactionId) && (
                          <div style={{ fontSize: "11px", color: "#667268", fontFamily: "monospace", marginTop: "2px" }}>
                            Txn: {b.razorpayPaymentId || b.transactionId}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Actions: Check-in, Check-out, Cancel (Modules 10 & 11) */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid #f0ebe2", paddingTop: "10px" }}>
                      {b.status === "confirmed" && (
                        <>
                          <button
                            onClick={() => handleCheckInGuest(b._id, b.guestName)}
                            className="btn-primary-action"
                            style={{ padding: "6px 14px", fontSize: "12px", background: "#1f7a3f" }}
                          >
                            ✓ Record Guest Check-In
                          </button>
                          <button
                            onClick={() => handleAdminCancelBooking(b._id, b.bookingReference)}
                            className="btn-delete-room"
                          >
                            Cancel Stay
                          </button>
                        </>
                      )}

                      {b.status === "checked-in" && (
                        <button
                          onClick={() => handleCheckOutGuest(b._id, b.guestName)}
                          className="btn-primary-action"
                          style={{ padding: "6px 14px", fontSize: "12px", background: "#2b6cb0" }}
                        >
                          🚪 Process Check-Out (Free Suite)
                        </button>
                      )}

                      <Link
                        to={`/booking/confirmation/${b.bookingReference}`}
                        className="filter-pill"
                        style={{ textDecoration: "none", fontSize: "12px" }}
                      >
                        View Official Receipt
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Booking History Pagination Bar */}
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  Showing <strong>{filteredBookings.length > 0 ? bookingStartIndex + 1 : 0}</strong>–<strong>{bookingEndIndex}</strong> of{" "}
                  <strong>{filteredBookings.length}</strong> {filteredBookings.length === 1 ? "booking" : "bookings"}
                </div>

                <div className="pagination-controls">
                  <div className="pagination-per-page">
                    <label htmlFor="bookingsPerPage">Per page:</label>
                    <select
                      id="bookingsPerPage"
                      value={bookingsPerPage}
                      onChange={(e) => {
                        setBookingsPerPage(Number(e.target.value));
                        setBookingPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  <div className="pagination-buttons">
                    <button
                      type="button"
                      className="pagination-btn"
                      onClick={() => setBookingPage(1)}
                      disabled={currentBookingPage === 1}
                      title="First Page"
                    >
                      «
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                      disabled={currentBookingPage === 1}
                      title="Previous Page"
                    >
                      ‹ Prev
                    </button>

                    {renderBookingPageNumbers()}

                    <button
                      type="button"
                      className="pagination-btn"
                      onClick={() => setBookingPage((p) => Math.min(totalBookingPages, p + 1))}
                      disabled={currentBookingPage === totalBookingPages}
                      title="Next Page"
                    >
                      Next ›
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      onClick={() => setBookingPage(totalBookingPages)}
                      disabled={currentBookingPage === totalBookingPages}
                      title="Last Page"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 3. ENQUIRY LIST SECTION (READ & REPLY VIA EMAIL)               */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "enquiries") && (
          <section className="admin-section-block" id="enquiries">
            <div className="section-title-row">
              <div>
                <h2>📩 Concierge Enquiry List</h2>
                <p>
                  Read customer inquiries submitted from the public home page and reply directly via email.
                </p>
              </div>

              <input
                type="text"
                placeholder="Search guest, email, suite..."
                className="search-input"
                value={enquirySearch}
                onChange={(e) => setEnquirySearch(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ marginBottom: "18px" }}>
              <div className="filter-group">
                <button
                  className={`filter-pill ${enquiryFilter === "all" ? "active" : ""}`}
                  onClick={() => setEnquiryFilter("all")}
                >
                  All Inquiries ({stats.totalEnquiries})
                </button>
                <button
                  className={`filter-pill ${enquiryFilter === "New" ? "active" : ""}`}
                  onClick={() => setEnquiryFilter("New")}
                >
                  ✉️ Pending Reply ({stats.newEnquiries})
                </button>
                <button
                  className={`filter-pill ${enquiryFilter === "Replied" ? "active" : ""}`}
                  onClick={() => setEnquiryFilter("Replied")}
                >
                  ✅ Replied ({stats.repliedEnquiries})
                </button>
              </div>
            </div>

            {loadingEnquiries ? (
              <div className="empty-state-box">
                <p>Loading inquiries...</p>
              </div>
            ) : enquiries.length === 0 ? (
              <div className="empty-state-box">
                <h3>No inquiries found</h3>
                <p>There are no inquiries matching your active search/filter.</p>
              </div>
            ) : (
              <div className="enquiries-list">
                {enquiries.map((enquiry) => {
                  const isNew = enquiry.status === "New";
                  const formattedDate = new Date(enquiry.createdAt).toLocaleDateString(
                    "en-IN",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <article
                      key={enquiry._id}
                      className={`enquiry-card ${
                        isNew ? "status-new" : "status-replied"
                      }`}
                    >
                      <div className="enquiry-header">
                        <div className="guest-info">
                          <h3>
                            {enquiry.firstName} {enquiry.lastName}
                          </h3>
                          <div className="guest-meta">
                            <span>
                              ✉️ <a href={`mailto:${enquiry.emailAddress}`}>{enquiry.emailAddress}</a>
                            </span>
                            {enquiry.phoneNumber && (
                              <span>📞 {enquiry.phoneNumber}</span>
                            )}
                            <span>🕒 {formattedDate}</span>
                            <span>
                              🏛️ <strong>Suite:</strong> {enquiry.suitePreference}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`enquiry-status-pill ${
                            isNew ? "new" : "replied"
                          }`}
                        >
                          {isNew ? "Pending Reply" : "Replied via Email"}
                        </span>
                      </div>

                      <div className="enquiry-body">
                        <div className="enquiry-body-label">
                          Guest Requirements / Note:
                        </div>
                        <p className="enquiry-body-text">
                          "{enquiry.remarks || "No additional remarks provided."}"
                        </p>
                      </div>

                      {enquiry.status === "Replied" && enquiry.replyMessage && (
                        <div className="reply-history-box">
                          <div className="reply-history-header">
                            <span>
                              ✓ Reply sent by {enquiry.repliedBy || "Concierge"} on{" "}
                              {new Date(enquiry.repliedAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>{enquiry.replySubject}</span>
                          </div>
                          <p className="reply-history-content">
                            {enquiry.replyMessage}
                          </p>
                        </div>
                      )}

                      <div className="enquiry-actions">
                        <button
                          onClick={() => handleOpenReplyModal(enquiry)}
                          className="btn-reply-action"
                        >
                          {isNew ? "✍️ Write & Send Reply" : "🔄 Send Follow-up"}
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteEnquiry(
                              enquiry._id,
                              `${enquiry.firstName} ${enquiry.lastName}`
                            )
                          }
                          className="btn-delete-enquiry"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 4. REVIEWS & RATINGS MODERATION SECTION (Module 8)              */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "reviews") && (
          <section className="admin-section-block" id="reviews">
            <div className="section-title-row">
              <div>
                <h2>⭐ Guest Reviews Moderation</h2>
                <p>
                  Review guest feedback, ratings, and moderate public visibility on the website.
                </p>
              </div>

              <button onClick={loadReviews} className="filter-pill">
                🔄 Refresh Reviews
              </button>
            </div>

            {loadingReviews ? (
              <div className="empty-state-box">
                <p>Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="empty-state-box">
                <h3>No Reviews Yet</h3>
                <p>Guest reviews submitted from customer profiles will display here for moderation.</p>
              </div>
            ) : (
              <div className="enquiries-list">
                {reviews.map((rev) => (
                  <article key={rev._id} className="enquiry-card">
                    <div className="enquiry-header">
                      <div>
                        <strong style={{ fontSize: "16px", color: "#142217" }}>
                          "{rev.title}"
                        </strong>
                        <div style={{ color: "#c49d68", fontSize: "15px", margin: "4px 0" }}>
                          {"★".repeat(rev.rating)} ({rev.rating}/5 Stars)
                        </div>
                        <div className="guest-meta">
                          <span>👤 {rev.userName} ({rev.userEmail})</span>
                          <span>🏛️ {rev.suiteName}</span>
                          <span>🕒 {new Date(rev.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>

                      <span
                        className="enquiry-status-pill"
                        style={{
                          background: rev.status === "published" ? "#eaf7ee" : "#fdf0f0",
                          color: rev.status === "published" ? "#1f7a3f" : "#a82e2e",
                        }}
                      >
                        {rev.status === "published" ? "✓ Live on Website" : "Hidden"}
                      </span>
                    </div>

                    <p style={{ margin: "4px 0", fontSize: "14px", color: "#333", lineHeight: "1.6" }}>
                      "{rev.comment}"
                    </p>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                      <button
                        onClick={() => handleToggleReviewStatus(rev._id, rev.status)}
                        className="btn-sm-action btn-view-receipt"
                      >
                        {rev.status === "published" ? "Hide from Public" : "Publish on Website"}
                      </button>
                      <button
                        onClick={() => handleDeleteReview(rev._id)}
                        className="btn-sm-action btn-cancel-res"
                      >
                        Delete Review
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 5. ADMIN PROFILE SECTION                                       */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "profile") && (
          <section className="admin-section-block" id="profile">
            <div className="section-title-row">
              <div>
                <h2>👤 Admin Profile & Settings</h2>
                <p>
                  Manage administrative credentials, name, email, and secure account password.
                </p>
              </div>
            </div>

            <div className="profile-section-grid">
              {/* Profile Card Left */}
              <div className="profile-card-left">
                <div className="profile-avatar-wrapper">
                  <div className="profile-avatar-circle">
                    {(photoPreview || adminUser?.profilePhoto) ? (
                      <img
                        src={photoPreview || adminUser?.profilePhoto}
                        alt={adminUser?.fullName || "Admin"}
                        className="profile-avatar-img"
                      />
                    ) : (
                      <span>
                        {adminUser?.fullName
                          ? adminUser.fullName.charAt(0).toUpperCase()
                          : "A"}
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="admin-photo-input"
                    className="avatar-upload-badge"
                    title="Upload profile photo"
                  >
                    📷
                  </label>
                  <input
                    id="admin-photo-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handlePhotoSelect}
                    disabled={uploadingPhoto}
                  />
                </div>

                <div className="avatar-actions-row">
                  <button
                    type="button"
                    className="btn-avatar-action btn-avatar-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto
                      ? "Saving..."
                      : (photoPreview || adminUser?.profilePhoto)
                      ? "📷 Change Photo"
                      : "📷 Upload Photo"}
                  </button>
                </div>

                <h3>{adminUser?.fullName || "Viceroy Administrator"}</h3>
                <p className="email">{adminUser?.email || "admin@viceroyresort.com"}</p>
                <div className="role-badge-tag">
                  ROLE: {adminUser?.role?.toUpperCase() || "ADMIN"}
                </div>

                <div className="profile-meta-list">
                  <div>
                    <span className="lbl">Account ID:</span>
                    <span style={{ fontSize: "11px", fontFamily: "monospace" }}>
                      {adminUser?._id ? adminUser._id.slice(-8) : "ADMIN-01"}
                    </span>
                  </div>
                  <div>
                    <span className="lbl">Privilege Level:</span>
                    <strong style={{ color: "var(--admin-green)" }}>Full Access</strong>
                  </div>
                  <div>
                    <span className="lbl">Managed Suites:</span>
                    <strong>{stats.totalRooms} Rooms</strong>
                  </div>
                  <div>
                    <span className="lbl">Handled Bookings:</span>
                    <strong>{bookings.length} Bookings</strong>
                  </div>
                  <div>
                    <span className="lbl">Check-Ins Handled:</span>
                    <strong>{adminOpsStats.checkInsHandled} Stays</strong>
                  </div>
                  <div>
                    <span className="lbl">Check-Outs Done:</span>
                    <strong>{adminOpsStats.checkOutsCompleted} Stays</strong>
                  </div>
                  <div>
                    <span className="lbl">Inquiries Answered:</span>
                    <strong>{adminOpsStats.enquiriesResolved} Inquiries</strong>
                  </div>
                  <div>
                    <span className="lbl">Reviews Moderated:</span>
                    <strong>{adminOpsStats.reviewsModerated} Reviews</strong>
                  </div>
                  <div>
                    <span className="lbl">Revenue Overseen:</span>
                    <strong style={{ color: "var(--admin-gold)" }}>₹{adminOpsStats.revenueHandled.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>

              {/* Profile Settings Right */}
              <div className="profile-forms-right">
                {/* Handled Operations Details Box */}
                <div className="profile-form-box profile-ops-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border-light)", paddingBottom: "12px", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <h3 style={{ margin: 0, border: "none", padding: 0 }}>📊 Handled Operations & Activity</h3>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--admin-text-muted)" }}>
                        Operational breakdown of reservations, check-ins, guest inquiries, and reviews handled by {adminUser?.fullName || "Administrator"}.
                      </p>
                    </div>

                    <div className="ops-filter-tabs">
                      <button
                        type="button"
                        className={`ops-tab-btn ${adminOpsTab === "all" ? "active" : ""}`}
                        onClick={() => setAdminOpsTab("all")}
                      >
                        All Operations
                      </button>
                      <button
                        type="button"
                        className={`ops-tab-btn ${adminOpsTab === "bookings" ? "active" : ""}`}
                        onClick={() => setAdminOpsTab("bookings")}
                      >
                        Stays ({bookings.length})
                      </button>
                      <button
                        type="button"
                        className={`ops-tab-btn ${adminOpsTab === "enquiries" ? "active" : ""}`}
                        onClick={() => setAdminOpsTab("enquiries")}
                      >
                        Inquiries ({enquiries.length})
                      </button>
                      <button
                        type="button"
                        className={`ops-tab-btn ${adminOpsTab === "reviews" ? "active" : ""}`}
                        onClick={() => setAdminOpsTab("reviews")}
                      >
                        Reviews ({reviews.length})
                      </button>
                    </div>
                  </div>

                  {/* 6 Key Operational Metrics Cards */}
                  <div className="ops-metrics-grid">
                    <div className="ops-metric-card">
                      <div className="ops-metric-header">
                        <span>🚪 Check-Ins Handled</span>
                        <span className="ops-badge-green">Live</span>
                      </div>
                      <div className="ops-metric-val">{adminOpsStats.checkInsHandled}</div>
                      <div className="ops-metric-sub">Guests checked in</div>
                    </div>

                    <div className="ops-metric-card">
                      <div className="ops-metric-header">
                        <span>🏁 Check-Outs Done</span>
                        <span className="ops-badge-blue">Completed</span>
                      </div>
                      <div className="ops-metric-val">{adminOpsStats.checkOutsCompleted}</div>
                      <div className="ops-metric-sub">Departures & suite releases</div>
                    </div>

                    <div className="ops-metric-card">
                      <div className="ops-metric-header">
                        <span>📅 Active Stays</span>
                        <span className="ops-badge-gold">On Record</span>
                      </div>
                      <div className="ops-metric-val">{adminOpsStats.activeConfirmed}</div>
                      <div className="ops-metric-sub">Confirmed guest stays</div>
                    </div>

                    <div className="ops-metric-card">
                      <div className="ops-metric-header">
                        <span>📩 Inquiries Answered</span>
                        <span className="ops-badge-purple">Concierge</span>
                      </div>
                      <div className="ops-metric-val">{adminOpsStats.enquiriesResolved} <small style={{ fontSize: "12px", color: "#666" }}>/ {stats.totalEnquiries}</small></div>
                      <div className="ops-metric-sub">Customer queries answered</div>
                    </div>

                    <div className="ops-metric-card">
                      <div className="ops-metric-header">
                        <span>⭐ Reviews Moderated</span>
                        <span className="ops-badge-gold">Feedback</span>
                      </div>
                      <div className="ops-metric-val">{adminOpsStats.reviewsModerated}</div>
                      <div className="ops-metric-sub">{adminOpsStats.publishedReviews} published on site</div>
                    </div>

                    <div className="ops-metric-card">
                      <div className="ops-metric-header">
                        <span>💰 Revenue Overseen</span>
                        <span className="ops-badge-green">Audited</span>
                      </div>
                      <div className="ops-metric-val" style={{ color: "var(--admin-gold)" }}>
                        ₹{adminOpsStats.revenueHandled.toLocaleString("en-IN")}
                      </div>
                      <div className="ops-metric-sub">From processed bookings</div>
                    </div>
                  </div>

                  {/* Detailed Recent Handled Operations Activity Feed */}
                  <div className="ops-recent-activity">
                    <h4 style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--admin-primary)", margin: "16px 0 10px" }}>
                      Recent Handled Activity & Audit Records:
                    </h4>

                    {(adminOpsTab === "all" || adminOpsTab === "bookings") && (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8a7c6a", marginBottom: "8px" }}>
                          🛎️ Guest Stays Handled ({bookings.slice(0, 5).length} recent)
                        </div>
                        {bookings.length === 0 ? (
                          <p style={{ fontSize: "13px", color: "var(--admin-text-muted)" }}>No booking operations handled yet.</p>
                        ) : (
                          <div className="ops-list">
                            {bookings.slice(0, 5).map((b) => (
                              <div key={b._id} className="ops-log-item">
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span className="booking-ref-badge" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                    #{b.bookingReference}
                                  </span>
                                  <div>
                                    <strong style={{ fontSize: "13px", color: "#142217" }}>{b.guestName}</strong>
                                    <span style={{ fontSize: "12px", color: "#666", marginLeft: "6px" }}>
                                      · {b.roomName} ({b.roomCategory || "Suite"})
                                    </span>
                                  </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#142217" }}>
                                    ₹{b.totalPrice?.toLocaleString("en-IN")}
                                  </span>
                                  <span className={`status-pill-badge ${b.status}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                                    {b.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(adminOpsTab === "all" || adminOpsTab === "enquiries") && (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8a7c6a", marginBottom: "8px" }}>
                          📩 Customer Enquiries Handled ({enquiries.slice(0, 4).length} recent)
                        </div>
                        {enquiries.length === 0 ? (
                          <p style={{ fontSize: "13px", color: "var(--admin-text-muted)" }}>No customer inquiries on record.</p>
                        ) : (
                          <div className="ops-list">
                            {enquiries.slice(0, 4).map((enq) => (
                              <div key={enq._id} className="ops-log-item">
                                <div>
                                  <strong style={{ fontSize: "13px", color: "#142217" }}>{enq.name}</strong>
                                  <span style={{ fontSize: "12px", color: "#666", marginLeft: "6px" }}>
                                    ({enq.email}) — <em>{enq.subject || "General Inquiry"}</em>
                                  </span>
                                </div>
                                <span className={`status-pill-badge ${enq.status === "Replied" ? "checked-out" : "confirmed"}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                                  {enq.status === "Replied" ? "✓ Replied" : "Pending"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(adminOpsTab === "all" || adminOpsTab === "reviews") && (
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#8a7c6a", marginBottom: "8px" }}>
                          ⭐ Guest Reviews Moderated ({reviews.slice(0, 4).length} recent)
                        </div>
                        {reviews.length === 0 ? (
                          <p style={{ fontSize: "13px", color: "var(--admin-text-muted)" }}>No customer reviews submitted yet.</p>
                        ) : (
                          <div className="ops-list">
                            {reviews.slice(0, 4).map((rev) => (
                              <div key={rev._id} className="ops-log-item">
                                <div>
                                  <strong style={{ fontSize: "13px", color: "#142217" }}>{rev.author || "Guest"}</strong>
                                  <span style={{ fontSize: "12px", color: "#c49d68", marginLeft: "6px" }}>
                                    {"★".repeat(rev.rating || 5)}
                                  </span>
                                  <span style={{ fontSize: "12px", color: "#666", marginLeft: "6px" }}>
                                    "{rev.comment?.slice(0, 50)}..."
                                  </span>
                                </div>
                                <span className={`status-pill-badge ${rev.status === "published" ? "checked-in" : "cancelled"}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                                  {rev.status === "published" ? "Published" : "Hidden"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form 1: Edit Profile Details */}
                <div className="profile-form-box">
                  <h3>Edit Admin Information</h3>
                  <form onSubmit={handleUpdateProfile}>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Admin Full Name</label>
                        <input
                          type="text"
                          required
                          value={profileForm.fullName}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              fullName: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label>Admin Email</label>
                        <input
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "16px", textAlign: "right" }}>
                      <button
                        type="submit"
                        className="btn-primary-action"
                        disabled={savingProfile}
                      >
                        {savingProfile ? "Saving..." : "Save Profile Details"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Form 2: Change Password */}
                <div className="profile-form-box">
                  <h3>Change Admin Password</h3>
                  <form onSubmit={handleUpdatePassword}>
                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label>Current Password</label>
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

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>New Password (min 6 chars)</label>
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

                      <div className="form-group">
                        <label>Confirm New Password</label>
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

                    <div style={{ marginTop: "16px", textAlign: "right" }}>
                      <button
                        type="submit"
                        className="btn-primary-action"
                        disabled={savingPassword}
                      >
                        {savingPassword ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* MODAL 1: ADD NEW ROOM */}
      {isAddRoomOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Add New Suite to Viceroy</h2>
              <button
                className="modal-close-btn"
                onClick={() => setIsAddRoomOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoomSubmit}>
              <div className="modal-body">
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Suite / Room Number *</label>
                    <input
                      type="text"
                      name="roomNumber"
                      placeholder="e.g. 104, 205, V-1"
                      required
                      value={newRoomForm.roomNumber}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          roomNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Suite Name *</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Sapphire Ocean Penthouse"
                      required
                      value={newRoomForm.name}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Location & Rooms in Suite */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Resort Location *</label>
                    <input
                      type="text"
                      name="location"
                      placeholder="e.g. Maldives Horizon Coast"
                      required
                      value={newRoomForm.location}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          location: e.target.value,
                        })
                      }
                    />
                    <div className="preset-photo-buttons">
                      <span style={{ fontSize: "11px", color: "#666" }}>Locations:</span>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setNewRoomForm((p) => ({ ...p, location: "Maldives Horizon Coast" }))
                        }
                      >
                        Maldives
                      </button>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setNewRoomForm((p) => ({ ...p, location: "Bali Tropical Botanical Valley" }))
                        }
                      >
                        Bali
                      </button>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setNewRoomForm((p) => ({ ...p, location: "Phuket Azure Peninsula" }))
                        }
                      >
                        Phuket
                      </button>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setNewRoomForm((p) => ({ ...p, location: "Goa Beachfront" }))
                        }
                      >
                        Goa
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Rooms in this Suite *</label>
                    <input
                      type="number"
                      name="totalRooms"
                      min="1"
                      max="12"
                      required
                      value={newRoomForm.totalRooms}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          totalRooms: e.target.value,
                        })
                      }
                    />
                    <span style={{ fontSize: "11px", color: "#777" }}>
                      Each suite includes 4 rooms (customizable)
                    </span>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={newRoomForm.category}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="Deluxe Room">Deluxe Room</option>
                      <option value="Ocean View Suite">Ocean View Suite</option>
                      <option value="Luxury Suite">Luxury Suite</option>
                      <option value="Presidential Suite">Presidential Suite</option>
                      <option value="Royal Beach Villa">Royal Beach Villa</option>
                      <option value="Garden Pavilion">Garden Pavilion</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Price Per Night (₹) *</label>
                    <input
                      type="number"
                      name="pricePerNight"
                      placeholder="e.g. 20000"
                      min="0"
                      required
                      value={newRoomForm.pricePerNight}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          pricePerNight: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Max Guests / Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      min="1"
                      max="10"
                      value={newRoomForm.capacity}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          capacity: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Initial Status</label>
                    <select
                      name="status"
                      value={newRoomForm.status}
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="available">🟢 Available (Ready to Book)</option>
                      <option value="booked">🔴 Booked (Occupied)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Suite Photograph URL</label>
                  <input
                    type="text"
                    name="image"
                    value={newRoomForm.image}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        image: e.target.value,
                      })
                    }
                    placeholder="/images/home1.png"
                  />
                  <div className="preset-photo-buttons">
                    <span style={{ fontSize: "11px", color: "#666" }}>Quick Presets:</span>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setNewRoomForm((p) => ({ ...p, image: "/images/home1.png" }))
                      }
                    >
                      Oceanfront Pavilion
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setNewRoomForm((p) => ({ ...p, image: "/images/viceroy-bath.jpg" }))
                      }
                    >
                      Sanctuary Bath
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setNewRoomForm((p) => ({ ...p, image: "/images/viceroy-villa.jpg" }))
                      }
                    >
                      Private Villa
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Amenities (Comma separated)</label>
                  <input
                    type="text"
                    name="amenities"
                    value={newRoomForm.amenities}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        amenities: e.target.value,
                      })
                    }
                    placeholder="Ocean View, King Bed, Private Pool, Wi-Fi"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    value={newRoomForm.description}
                    onChange={(e) =>
                      setNewRoomForm({
                        ...newRoomForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Private terrace perched above the coastline with panoramic views..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddRoomOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={submittingRoom}
                >
                  {submittingRoom ? "Saving..." : "+ Add Suite & Update Website"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / UPDATE EXISTING SUITE */}
      {isEditRoomOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Edit Suite — {editRoomForm.name}</h2>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666" }}>
                  Suite {editRoomForm.roomNumber} · Updates reflect immediately across all website booking and display pages.
                </p>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsEditRoomOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditRoomSubmit}>
              <div className="modal-body">
                {/* Row 1: Suite Number & Suite Name */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Suite / Room Number *</label>
                    <input
                      type="text"
                      name="roomNumber"
                      required
                      value={editRoomForm.roomNumber}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          roomNumber: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Suite Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={editRoomForm.name}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Row 2: Location & Total Rooms */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Resort Location *</label>
                    <input
                      type="text"
                      name="location"
                      required
                      placeholder="e.g. Maldives Horizon Coast"
                      value={editRoomForm.location}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          location: e.target.value,
                        })
                      }
                    />
                    <div className="preset-photo-buttons">
                      <span style={{ fontSize: "11px", color: "#666" }}>Presets:</span>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setEditRoomForm((p) => ({ ...p, location: "Maldives Horizon Coast" }))
                        }
                      >
                        Maldives
                      </button>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setEditRoomForm((p) => ({ ...p, location: "Bali Tropical Botanical Valley" }))
                        }
                      >
                        Bali
                      </button>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setEditRoomForm((p) => ({ ...p, location: "Phuket Azure Peninsula" }))
                        }
                      >
                        Phuket
                      </button>
                      <button
                        type="button"
                        className="photo-chip"
                        onClick={() =>
                          setEditRoomForm((p) => ({ ...p, location: "Goa Beachfront" }))
                        }
                      >
                        Goa
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Rooms in this Suite (e.g. 4 Rooms) *</label>
                    <input
                      type="number"
                      name="totalRooms"
                      min="1"
                      max="12"
                      required
                      value={editRoomForm.totalRooms}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          totalRooms: e.target.value,
                        })
                      }
                    />
                    <span style={{ fontSize: "11px", color: "#777" }}>
                      Each suite contains 4 rooms across locations
                    </span>
                  </div>
                </div>

                {/* Row 3: Category & Price */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={editRoomForm.category}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="Deluxe Room">Deluxe Room</option>
                      <option value="Ocean View Suite">Ocean View Suite</option>
                      <option value="Luxury Suite">Luxury Suite</option>
                      <option value="Presidential Suite">Presidential Suite</option>
                      <option value="Royal Beach Villa">Royal Beach Villa</option>
                      <option value="Garden Pavilion">Garden Pavilion</option>
                      <option value="SANCTUARY SUITE MASTER QUARTERS">SANCTUARY SUITE MASTER QUARTERS</option>
                      <option value="PRIVATE WELLNESS RETREAT">PRIVATE WELLNESS RETREAT</option>
                      <option value="PRIVATE RESIDENCE">PRIVATE RESIDENCE</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Price Per Night (₹) *</label>
                    <input
                      type="number"
                      name="pricePerNight"
                      min="0"
                      required
                      value={editRoomForm.pricePerNight}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          pricePerNight: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Row 4: Max Guests & Status */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Max Guests / Capacity</label>
                    <input
                      type="number"
                      name="capacity"
                      min="1"
                      max="16"
                      value={editRoomForm.capacity}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          capacity: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Current Status</label>
                    <select
                      name="status"
                      value={editRoomForm.status}
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          status: e.target.value,
                        })
                      }
                    >
                      <option value="available">🟢 Available (Bookable on website)</option>
                      <option value="booked">🔴 Booked (Reserved)</option>
                      <option value="maintenance">🟡 Under Maintenance</option>
                    </select>
                  </div>
                </div>

                {/* Photograph */}
                <div className="form-group">
                  <label>Suite Photograph URL</label>
                  <input
                    type="text"
                    name="image"
                    value={editRoomForm.image}
                    onChange={(e) =>
                      setEditRoomForm({
                        ...editRoomForm,
                        image: e.target.value,
                      })
                    }
                  />
                  <div className="preset-photo-buttons">
                    <span style={{ fontSize: "11px", color: "#666" }}>Presets:</span>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setEditRoomForm((p) => ({ ...p, image: "/images/viceroy-bedroom.jpg" }))
                      }
                    >
                      Oceanfront Pavilion
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setEditRoomForm((p) => ({ ...p, image: "/images/viceroy-bath.jpg" }))
                      }
                    >
                      Sanctuary Bath
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setEditRoomForm((p) => ({ ...p, image: "/images/viceroy-villa.jpg" }))
                      }
                    >
                      Private Villa
                    </button>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setEditRoomForm((p) => ({ ...p, image: "/images/home1.png" }))
                      }
                    >
                      Classic Horizon
                    </button>
                  </div>
                </div>

                {/* Amenities */}
                <div className="form-group">
                  <label>Amenities (Comma separated)</label>
                  <input
                    type="text"
                    name="amenities"
                    value={editRoomForm.amenities}
                    onChange={(e) =>
                      setEditRoomForm({
                        ...editRoomForm,
                        amenities: e.target.value,
                      })
                    }
                    placeholder="Ocean View, 4 Luxury Rooms, King Bed, Private Pool, Wi-Fi"
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    rows="3"
                    value={editRoomForm.description}
                    onChange={(e) =>
                      setEditRoomForm({
                        ...editRoomForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditRoomOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={submittingEditRoom}
                >
                  {submittingEditRoom ? "Saving..." : "💾 Update Suite Everywhere"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPLY TO GUEST ENQUIRY */}
      {replyModalOpen && selectedEnquiry && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Concierge Reply to {selectedEnquiry.firstName} {selectedEnquiry.lastName}</h2>
              <button
                className="modal-close-btn"
                onClick={() => setReplyModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReply}>
              <div className="modal-body">
                <div className="enquiry-body" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span className="enquiry-body-label">
                      Inquiry for: <strong>{selectedEnquiry.suitePreference}</strong>
                    </span>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      To: {selectedEnquiry.emailAddress}
                    </span>
                  </div>
                  <p className="enquiry-body-text">
                    "{selectedEnquiry.remarks || "No additional remarks"}"
                  </p>
                </div>

                <div className="form-group">
                  <label>Email Subject</label>
                  <input
                    type="text"
                    required
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label>Personalized Response</label>
                    <div className="quick-templates">
                      <button
                        type="button"
                        className="template-btn"
                        onClick={() =>
                          setReplyMessage(
                            `Dear ${selectedEnquiry.firstName},\n\nThank you for reaching out to Viceroy Resort. We are delighted to inform you that the ${selectedEnquiry.suitePreference} is available for your desired timeline.\n\nOur concierge team would be pleased to finalize your reservation and arrange bespoke experiences (private transfers, dining, spa reservations) for your arrival.\n\nWarmest regards,\nViceroy Concierge Team`
                          )
                        }
                      >
                        Availability Template
                      </button>
                      <button
                        type="button"
                        className="template-btn"
                        onClick={() =>
                          setReplyMessage(
                            `Dear ${selectedEnquiry.firstName},\n\nThank you for your valued inquiry regarding Viceroy Resort.\n\nRegarding your note: "${selectedEnquiry.remarks}", we would be honored to tailor these arrangements for you. Kindly reply to this email or call our direct concierge line at +91 98765 43210 so we may attend to every detail.\n\nWarmest regards,\nViceroy Concierge Team`
                          )
                        }
                      >
                        Special Request Template
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows="7"
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReplyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary-action"
                  disabled={sendingReply}
                >
                  {sendingReply ? "Sending Email..." : "✉️ Send Official Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && <div className="toast-notice">{toast}</div>}
    </div>
  );
}

export default AdminDashboard;
