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
  fetchAllUsers,
  updateUserRoleApi,
  updateUserStatusApi,
  deleteUserApi,
  fetchAllPayments,
  fetchAdminWalletTransactions,
  adminAdjustWalletBalanceApi,
  fetchAllMediaApi,
  uploadMediaApi,
  deleteMediaApi,
  fetchResortContentApi,
  updateResortContentApi,
} from "../../api/adminApi";
import { logoutUser, uploadProfilePhotoApi, deleteProfilePhotoApi } from "../../api/authApi";
import "./AdminDashboard.css";

const resolveImgUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `http://localhost:4000${url}`;
  return url;
};

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

  // Users Management State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");

  // Payments Management State
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [paymentSummary, setPaymentSummary] = useState({ totalRevenue: 0, totalRefunded: 0, netRevenue: 0 });

  // Wallet Monitoring State
  const [walletTxns, setWalletTxns] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletSummary, setWalletSummary] = useState({ totalDeposited: 0, totalSpent: 0, netCirculation: 0 });
  const [adjustWalletModal, setAdjustWalletModal] = useState({ open: false, user: null, amount: "", type: "credit", description: "" });
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Media Library State
  const [mediaList, setMediaList] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState("all");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaCategory, setMediaCategory] = useState("gallery");
  const mediaFileInputRef = useRef(null);

  // Resort Content CMS State
  const [cmsContent, setCmsContent] = useState({
    resortName: "Viceroy Resort",
    tagline: "Where Luxury Meets the Horizon",
    heroEyebrow: "EXCLUSIVE COASTAL SANCTUARY",
    heroTitle: "Where Luxury Meets the Horizon",
    heroDescription: "",
    aboutEyebrow: "A TIMELESS REFUGE",
    aboutTitle: "Crafted for serenity, immersed in nature.",
    aboutDescription: "",
    experienceEyebrow: "THE ART OF SLOW LIVING",
    experienceTitle: "Your time, beautifully uninterrupted.",
    experienceDescription: "",
    contactEmail: "concierge@viceroyresort.com",
    contactPhone: "+91 98765 43210",
    contactAddress: "Viceroy Sanctuary, Azure Coastline, Maldives",
    amenities: [],
  });
  const [loadingCms, setLoadingCms] = useState(false);
  const [savingCms, setSavingCms] = useState(false);

  // Location Filter State
  const [locationFilter, setLocationFilter] = useState("all");

  // Add Room Modal State
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [newRoomForm, setNewRoomForm] = useState({
    roomNumber: "",
    name: "",
    location: "Munnar",
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
    location: "Munnar",
    totalRooms: 4,
    category: "",
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

  // Profile Photo & Suite Photo State
  const fileInputRef = useRef(null);
  const suitePhotoInputRef = useRef(null);
  const editSuitePhotoInputRef = useRef(null);
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

  // Custom Confirmation Modal State (replaces native window.confirm)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Yes, Proceed",
    confirmType: "danger",
    icon: "⚠️",
    onConfirm: null,
  });

  const openConfirmModal = ({
    title,
    message,
    confirmText = "Yes, Proceed",
    confirmType = "danger",
    icon = "⚠️",
    onConfirm,
  }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      confirmType,
      icon,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
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

  // 7. Fetch Users
  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchAllUsers({
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      });
      setUsers(data.users || []);
    } catch (err) {
      console.warn("Could not load users:", err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter]);

  // 8. Fetch Payments
  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const data = await fetchAllPayments();
      setPayments(data.payments || []);
      if (data.summary) setPaymentSummary(data.summary);
    } catch (err) {
      console.warn("Could not load payments:", err.message);
    } finally {
      setLoadingPayments(false);
    }
  }, []);

  // 9. Fetch Wallet Transactions
  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const data = await fetchAdminWalletTransactions();
      setWalletTxns(data.transactions || []);
      if (data.summary) setWalletSummary(data.summary);
    } catch (err) {
      console.warn("Could not load wallet transactions:", err.message);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  // 10. Fetch Media Library
  const loadMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const data = await fetchAllMediaApi({ category: mediaCategoryFilter });
      setMediaList(data.media || []);
    } catch (err) {
      console.warn("Could not load media:", err.message);
    } finally {
      setLoadingMedia(false);
    }
  }, [mediaCategoryFilter]);

  // 11. Fetch CMS Content
  const loadCms = useCallback(async () => {
    setLoadingCms(true);
    try {
      const data = await fetchResortContentApi();
      if (data?.content) setCmsContent(data.content);
    } catch (err) {
      console.warn("Could not load resort content:", err.message);
    } finally {
      setLoadingCms(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadRooms();
    loadBookings();
    loadEnquiries();
    loadReviews();
    loadProfile();
    loadUsers();
    loadPayments();
    loadWallet();
    loadMedia();
    loadCms();
  }, [
    loadStats,
    loadRooms,
    loadBookings,
    loadEnquiries,
    loadReviews,
    loadProfile,
    loadUsers,
    loadPayments,
    loadWallet,
    loadMedia,
    loadCms,
  ]);

  // User Actions
  const handleUserRoleChange = async (userId, newRole) => {
    try {
      await updateUserRoleApi(userId, newRole);
      showToast(`User role updated to ${newRole}`);
      loadUsers();
    } catch (err) {
      showToast("Error updating role: " + err.message);
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await updateUserStatusApi(userId, nextStatus);
      showToast(`User status set to ${nextStatus}`);
      loadUsers();
    } catch (err) {
      showToast("Error updating status: " + err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"?`)) return;
    try {
      await deleteUserApi(userId);
      showToast("User deleted successfully");
      loadUsers();
    } catch (err) {
      showToast("Error deleting user: " + err.message);
    }
  };

  // Wallet Adjustment Action
  const handleAdjustWalletSubmit = async (e) => {
    e.preventDefault();
    if (!adjustWalletModal.amount || Number(adjustWalletModal.amount) <= 0) {
      showToast("Please enter a valid positive amount");
      return;
    }
    setSubmittingAdjust(true);
    try {
      await adminAdjustWalletBalanceApi({
        userId: adjustWalletModal.user._id,
        amount: Number(adjustWalletModal.amount),
        type: adjustWalletModal.type,
        description: adjustWalletModal.description || `Admin manual ${adjustWalletModal.type}`,
      });
      showToast(`Wallet ${adjustWalletModal.type}ed successfully`);
      setAdjustWalletModal({ open: false, user: null, amount: "", type: "credit", description: "" });
      loadWallet();
      loadUsers();
    } catch (err) {
      showToast("Failed to adjust wallet: " + err.message);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Media Actions
  const handleUploadMediaSubmit = async (e) => {
    e.preventDefault();
    if (!mediaFile) {
      showToast("Please select an image file to upload");
      return;
    }
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("image", mediaFile);
      formData.append("title", mediaTitle || mediaFile.name);
      formData.append("category", mediaCategory);

      await uploadMediaApi(formData);
      showToast("Image uploaded to media library!");
      setMediaFile(null);
      setMediaTitle("");
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = "";
      loadMedia();
    } catch (err) {
      showToast("Upload failed: " + err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteMedia = async (id) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      await deleteMediaApi(id);
      showToast("Image deleted successfully");
      loadMedia();
    } catch (err) {
      showToast("Failed to delete image: " + err.message);
    }
  };

  // CMS Content Action
  const handleSaveCms = async (e) => {
    e.preventDefault();
    setSavingCms(true);
    try {
      await updateResortContentApi(cmsContent);
      showToast("Resort website content updated successfully!");
    } catch (err) {
      showToast("Failed to save content: " + err.message);
    } finally {
      setSavingCms(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  // Open Add Room Modal with auto-calculated next suite number
  const handleOpenAddRoom = () => {
    let nextNum = 101;
    if (Array.isArray(rooms) && rooms.length > 0) {
      const numericNums = rooms
        .map((r) => parseInt(r.roomNumber, 10))
        .filter((n) => !isNaN(n) && n > 0);
      if (numericNums.length > 0) {
        nextNum = Math.max(...numericNums) + 1;
      }
    }

    setNewRoomForm({
      roomNumber: String(nextNum),
      name: "",
      location: "Maldives Horizon Coast",
      totalRooms: 4,
      category: "Ocean View Suite",
      pricePerNight: "",
      capacity: 4,
      status: "available",
      image: "/images/viceroy-bedroom.jpg",
      amenities: "Oceanfront View, King Bed, Private Balcony, Wi-Fi, Breakfast Included",
      description: "",
    });
    setIsAddRoomOpen(true);
  };

  // Suite Photo Upload Handler
  const handleSuitePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (e.g. JPG, PNG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewRoomForm((p) => ({ ...p, image: reader.result }));
      showToast("Suite photo selected.");
    };
    reader.readAsDataURL(file);
  };

  // Edit Suite Photo Upload Handler
  const handleEditSuitePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (e.g. JPG, PNG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditRoomForm((p) => ({ ...p, image: reader.result }));
      showToast("Suite photo selected.");
    };
    reader.readAsDataURL(file);
  };

  // Add Room Submit
  const handleAddRoomSubmit = async (e) => {
    e.preventDefault();
    if (!newRoomForm.name?.trim()) {
      showToast("Please enter a Suite Name.");
      return;
    }

    const rawPrice = String(newRoomForm.pricePerNight).replace(/[^0-9.]/g, "");
    const cleanedPrice = Number(rawPrice);
    if (!rawPrice || isNaN(cleanedPrice) || cleanedPrice <= 0) {
      showToast("Please enter a valid positive Price per Night.");
      return;
    }

    setSubmittingRoom(true);
    try {
      const res = await createRoom({
        ...newRoomForm,
        roomNumber: newRoomForm.roomNumber?.trim() || undefined,
        name: newRoomForm.name.trim(),
        location: newRoomForm.location?.trim() || "Maldives Horizon Coast",
        totalRooms: Number(newRoomForm.totalRooms) || 4,
        pricePerNight: cleanedPrice,
        capacity: Number(newRoomForm.capacity) || 4,
        status: "available",
        image: newRoomForm.image?.trim() || "/images/viceroy-bedroom.jpg",
      });
      showToast(res.message || `Suite ${newRoomForm.roomNumber || ""} added to inventory and published across all website pages!`);
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
        amenities: "Oceanfront View, King Bed, Private Balcony, Wi-Fi, Breakfast Included",
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

    const rawPrice = String(editRoomForm.pricePerNight).replace(/[^0-9.]/g, "");
    const cleanedPrice = Number(rawPrice);
    if (!rawPrice || isNaN(cleanedPrice) || cleanedPrice <= 0) {
      showToast("Please enter a valid positive Price per Night.");
      return;
    }

    setSubmittingEditRoom(true);
    try {
      await updateRoom(editingRoomId, {
        ...editRoomForm,
        location: editRoomForm.location?.trim() || "Maldives Horizon Coast",
        totalRooms: Number(editRoomForm.totalRooms) || 4,
        pricePerNight: cleanedPrice,
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
  const handleDeleteRoom = (id, roomNumber, name) => {
    openConfirmModal({
      title: "Remove Luxury Suite",
      message: `Are you sure you want to permanently remove Suite ${roomNumber} (${name})? This suite will be deleted from public listings and cannot be recovered.`,
      confirmText: "Delete Suite",
      confirmType: "danger",
      icon: "🗑️",
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await deleteRoom(id);
          showToast(`Suite ${roomNumber} deleted successfully.`);
          loadRooms();
          loadStats();
        } catch (err) {
          showToast("Failed to delete room: " + err.message);
        }
      },
    });
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
  const handleAdminCancelBooking = (bookingId, ref) => {
    openConfirmModal({
      title: "Cancel Guest Reservation",
      message: `Are you sure you want to cancel reservation #${ref}? The paid amount will be refunded directly to the guest's Viceroy Wallet for their next booking.`,
      confirmText: "Cancel Reservation",
      confirmType: "danger",
      icon: "🚫",
      onConfirm: async () => {
        closeConfirmModal();
        try {
          const res = await cancelBooking(bookingId, "Cancelled by administrator");
          showToast(res.message || `Booking #${ref} has been cancelled and refunded to guest wallet.`);
          loadBookings();
          loadRooms();
          loadStats();
        } catch (err) {
          showToast("Failed to cancel: " + err.message);
        }
      },
    });
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
  const handleDeleteEnquiry = (id, guestName) => {
    openConfirmModal({
      title: "Delete Concierge Inquiry",
      message: `Are you sure you want to remove the concierge inquiry from ${guestName}?`,
      confirmText: "Delete Inquiry",
      confirmType: "danger",
      icon: "🗑️",
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await deleteEnquiry(id);
          showToast("Enquiry deleted.");
          loadEnquiries();
          loadStats();
        } catch (err) {
          showToast("Failed to delete enquiry: " + err.message);
        }
      },
    });
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
  const handleDeleteReview = (reviewId) => {
    openConfirmModal({
      title: "Delete Customer Review",
      message: "Are you sure you want to permanently remove this customer review from the resort portal?",
      confirmText: "Delete Review",
      confirmType: "danger",
      icon: "🗑️",
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await deleteReview(reviewId);
          showToast("Review deleted.");
          loadReviews();
        } catch (err) {
          showToast("Failed to delete review: " + err.message);
        }
      },
    });
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

  // Profile Photo Upload Handlers via Multer Multipart API
  const handlePhotoSelect = async (e) => {
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

    const localPreview = URL.createObjectURL(file);
    setPhotoPreview(localPreview);

    try {
      setUploadingPhoto(true);
      const res = await uploadProfilePhotoApi(file);
      const photoPath = res.profilePhoto ? (res.profilePhoto.startsWith("http") ? res.profilePhoto : `http://localhost:4000${res.profilePhoto}`) : localPreview;
      setPhotoPreview(photoPath);
      setAdminUser(res.user);
      setProfileForm((prev) => ({ ...prev, profilePhoto: res.profilePhoto }));
      localStorage.setItem("user", JSON.stringify(res.user));
      window.dispatchEvent(new Event("user_updated"));
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

  // Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("New password and confirmation do not match.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showToast("New password must contain at least 8 characters.");
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
                  src={resolveImgUrl(photoPreview || adminUser?.profilePhoto)}
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
            🛏️ Rooms ({stats.totalRooms})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "bookings" ? "active" : ""}`}
            onClick={() => setActiveSection("bookings")}
          >
            📅 Bookings ({bookings.length})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "users" ? "active" : ""}`}
            onClick={() => setActiveSection("users")}
          >
            👥 Users ({users.length})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "payments" ? "active" : ""}`}
            onClick={() => setActiveSection("payments")}
          >
            💳 Payments ({payments.length})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "wallet" ? "active" : ""}`}
            onClick={() => setActiveSection("wallet")}
          >
            👛 Wallet Ledger
          </button>
          <button
            className={`jump-link-btn ${activeSection === "media" ? "active" : ""}`}
            onClick={() => setActiveSection("media")}
          >
            🖼️ Media Gallery ({mediaList.length})
          </button>
          <button
            className={`jump-link-btn ${activeSection === "cms" ? "active" : ""}`}
            onClick={() => setActiveSection("cms")}
          >
            📝 Website CMS
          </button>
          <button
            className={`jump-link-btn ${activeSection === "enquiries" ? "active" : ""}`}
            onClick={() => setActiveSection("enquiries")}
          >
            📩 Enquiries ({stats.totalEnquiries})
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
                  onClick={handleOpenAddRoom}
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
                  onClick={handleOpenAddRoom}
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
                          <strong style={{ color: b.paymentMethod === "Razorpay" ? "#0d6efd" : b.paymentMethod === "Wallet" ? "#15803d" : "#142217" }}>
                            {b.paymentMethod === "Wallet" ? "💳 Viceroy Wallet" : b.paymentMethod || "Razorpay"}
                          </strong>
                          <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "3px", fontWeight: "bold", background: b.paymentStatus === "refunded" ? "#dcfce7" : b.paymentStatus?.toLowerCase() === "paid" ? "#d1fae5" : "#fef3c7", color: b.paymentStatus === "refunded" ? "#166534" : b.paymentStatus?.toLowerCase() === "paid" ? "#065f46" : "#92400e" }}>
                            {b.paymentStatus === "refunded" ? "Refunded to Wallet" : b.paymentStatus || "Paid"}
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
        {/* 5. GUEST & USER ACCOUNTS MANAGEMENT SECTION                     */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "users") && (
          <section className="admin-section-block" id="users">
            <div className="section-title-row">
              <div>
                <h2>👥 Guest & Staff Accounts Management</h2>
                <p>
                  Manage registered users, review wallet balances, adjust roles between guest and administrator, and maintain platform security.
                </p>
              </div>

              <button onClick={loadUsers} className="filter-pill">
                🔄 Refresh Users
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="filter-toolbar" style={{ marginBottom: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="🔍 Search by name, email, or phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  flex: "1 1 250px",
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid #dcd3c5",
                  fontSize: "13px",
                }}
              />

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid #dcd3c5",
                  fontSize: "13px",
                  background: "#fff",
                }}
              >
                <option value="all">All Roles</option>
                <option value="customer">Customers Only</option>
                <option value="admin">Administrators Only</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid #dcd3c5",
                  fontSize: "13px",
                  background: "#fff",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="suspended">Suspended Accounts</option>
              </select>
            </div>

            {loadingUsers ? (
              <div className="empty-state-box">
                <p>Loading accounts...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state-box">
                <h3>No Users Found</h3>
                <p>No user accounts matched your search criteria.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email & Phone</th>
                      <th>Role</th>
                      <th>Account Status</th>
                      <th>Wallet Balance</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {u.profilePhoto ? (
                              <img
                                src={resolveImgUrl(u.profilePhoto)}
                                alt={u.fullName}
                                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  background: "#142217",
                                  color: "#c49d68",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "13px",
                                  fontWeight: "bold",
                                }}
                              >
                                {u.fullName ? u.fullName.charAt(0).toUpperCase() : "U"}
                              </div>
                            )}
                            <div>
                              <strong>{u.fullName}</strong>
                              {u._id === adminUser?._id && (
                                <span style={{ marginLeft: "6px", fontSize: "10px", color: "#c49d68" }}>(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{u.email}</div>
                          <div style={{ fontSize: "11px", color: "#8a7c6a" }}>{u.phone || "No phone"}</div>
                        </td>
                        <td>
                          <select
                            value={u.role}
                            disabled={u._id === adminUser?._id}
                            onChange={(e) => handleUserRoleChange(u._id, e.target.value)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              border: "1px solid #dcd3c5",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: u.role === "admin" ? "#c49d68" : "#142217",
                            }}
                          >
                            <option value="customer">Customer</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => handleUserStatusToggle(u._id, u.status || "active")}
                            disabled={u._id === adminUser?._id}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              border: "none",
                              fontSize: "11px",
                              fontWeight: "bold",
                              cursor: u._id === adminUser?._id ? "not-allowed" : "pointer",
                              background: u.status === "suspended" ? "#fdf0f0" : "#eaf7ee",
                              color: u.status === "suspended" ? "#a82e2e" : "#1f7a3f",
                            }}
                          >
                            {u.status === "suspended" ? "⛔ Suspended" : "✓ Active"}
                          </button>
                        </td>
                        <td>
                          <strong style={{ color: "#142217" }}>
                            ₹{(u.walletBalance || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td style={{ fontSize: "12px", color: "#6a7b70" }}>
                          {new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => setAdjustWalletModal({ open: true, user: u, amount: "", type: "credit", description: "" })}
                              className="btn-sm-action"
                              style={{ background: "#fbf6ec", color: "#826231", border: "1px solid #c49d68", fontSize: "11px", padding: "4px 8px" }}
                            >
                              👛 Adjust Wallet
                            </button>
                            {u._id !== adminUser?._id && (
                              <button
                                onClick={() => handleDeleteUser(u._id, u.fullName)}
                                className="btn-sm-action btn-cancel-res"
                                style={{ fontSize: "11px", padding: "4px 8px" }}
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 6. PAYMENTS & TRANSACTIONS MANAGEMENT SECTION                   */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "payments") && (
          <section className="admin-section-block" id="payments">
            <div className="section-title-row">
              <div>
                <h2>💳 Payments & Revenue Ledger</h2>
                <p>
                  Comprehensive record of all guest transactions, gateway verification tokens, and refund history.
                </p>
              </div>

              <button onClick={loadPayments} className="filter-pill">
                🔄 Refresh Payments
              </button>
            </div>

            {/* Top Revenue Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div style={{ background: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e7ded2", borderLeft: "4px solid #1f7a3f" }}>
                <span style={{ fontSize: "12px", color: "#8a7c6a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Gross Revenue</span>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#1f7a3f", marginTop: "4px" }}>
                  ₹{paymentSummary.totalRevenue.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e7ded2", borderLeft: "4px solid #c95d32" }}>
                <span style={{ fontSize: "12px", color: "#8a7c6a", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Refunds</span>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#c95d32", marginTop: "4px" }}>
                  ₹{paymentSummary.totalRefunded.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ background: "#142217", padding: "18px", borderRadius: "8px", border: "1px solid #c49d68" }}>
                <span style={{ fontSize: "12px", color: "#c49d68", textTransform: "uppercase", letterSpacing: "0.5px" }}>Net Realized Revenue</span>
                <div style={{ fontSize: "24px", fontWeight: "700", color: "#fbf6ec", marginTop: "4px" }}>
                  ₹{paymentSummary.netRevenue.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="filter-toolbar" style={{ marginBottom: "18px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="🔍 Search transaction ID or guest email..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                style={{
                  flex: "1 1 250px",
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid #dcd3c5",
                  fontSize: "13px",
                }}
              />

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid #dcd3c5",
                  fontSize: "13px",
                  background: "#fff",
                }}
              >
                <option value="all">All Payment Statuses</option>
                <option value="successful">Successful</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "6px",
                  border: "1px solid #dcd3c5",
                  fontSize: "13px",
                  background: "#fff",
                }}
              >
                <option value="all">All Payment Methods</option>
                <option value="Razorpay">Razorpay</option>
                <option value="Wallet">Wallet</option>
                <option value="Pay at Resort">Pay at Resort</option>
              </select>
            </div>

            {loadingPayments ? (
              <div className="empty-state-box">
                <p>Loading payments ledger...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="empty-state-box">
                <h3>No Payments Recorded</h3>
                <p>Transactions will appear here automatically when reservations are made.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Booking Ref</th>
                      <th>Guest Email</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments
                      .filter((p) => {
                        if (paymentStatusFilter !== "all" && p.status !== paymentStatusFilter) return false;
                        if (paymentMethodFilter !== "all" && p.paymentMethod !== paymentMethodFilter) return false;
                        if (paymentSearch) {
                          const term = paymentSearch.toLowerCase();
                          return (
                            p.transactionId?.toLowerCase().includes(term) ||
                            p.bookingReference?.toLowerCase().includes(term) ||
                            p.guestEmail?.toLowerCase().includes(term)
                          );
                        }
                        return true;
                      })
                      .map((p) => (
                        <tr key={p._id}>
                          <td>
                            <code style={{ fontSize: "12px", background: "#f4efe6", padding: "2px 6px", borderRadius: "4px" }}>
                              {p.transactionId}
                            </code>
                          </td>
                          <td>
                            <strong>{p.bookingReference}</strong>
                          </td>
                          <td>{p.guestEmail}</td>
                          <td>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: "600",
                                background: p.paymentMethod === "Wallet" ? "#fbf6ec" : "#eef4f8",
                                color: p.paymentMethod === "Wallet" ? "#826231" : "#2b6cb0",
                              }}
                            >
                              {p.paymentMethod}
                            </span>
                          </td>
                          <td>
                            <strong>₹{p.amount.toLocaleString("en-IN")}</strong>
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                background:
                                  p.status === "successful"
                                    ? "#eaf7ee"
                                    : p.status === "refunded"
                                    ? "#fdf0f0"
                                    : "#fff7e6",
                                color:
                                  p.status === "successful"
                                    ? "#1f7a3f"
                                    : p.status === "refunded"
                                    ? "#a82e2e"
                                    : "#b7791f",
                              }}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "#6a7b70" }}>
                            {new Date(p.createdAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 7. WALLET LEDGER & MONITORING SECTION                            */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "wallet") && (
          <section className="admin-section-block" id="wallet">
            <div className="section-title-row">
              <div>
                <h2>👛 Customer Wallet Ledger & Monitoring</h2>
                <p>
                  Audit all user wallet top-ups, reservation debits, refunds, and manual administrator adjustments.
                </p>
              </div>

              <button onClick={loadWallet} className="filter-pill">
                🔄 Refresh Ledger
              </button>
            </div>

            {/* Wallet Circulation Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div style={{ background: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e7ded2" }}>
                <span style={{ fontSize: "12px", color: "#8a7c6a", textTransform: "uppercase" }}>Total Wallet Deposits</span>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#1f7a3f", marginTop: "4px" }}>
                  ₹{walletSummary.totalDeposited.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e7ded2" }}>
                <span style={{ fontSize: "12px", color: "#8a7c6a", textTransform: "uppercase" }}>Total Stays Paid via Wallet</span>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#2b6cb0", marginTop: "4px" }}>
                  ₹{walletSummary.totalSpent.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e7ded2" }}>
                <span style={{ fontSize: "12px", color: "#8a7c6a", textTransform: "uppercase" }}>Active Wallet Balance In Circulation</span>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "#c49d68", marginTop: "4px" }}>
                  ₹{walletSummary.netCirculation.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {loadingWallet ? (
              <div className="empty-state-box">
                <p>Loading wallet transactions...</p>
              </div>
            ) : walletTxns.length === 0 ? (
              <div className="empty-state-box">
                <h3>No Wallet Transactions</h3>
                <p>Customer deposits and payments will be logged here in real-time.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Balance After</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletTxns.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <strong>{t.userId?.fullName || "User"}</strong>
                          <div style={{ fontSize: "11px", color: "#8a7c6a" }}>{t.userId?.email}</div>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              background: t.type === "credit" ? "#eaf7ee" : "#fdf0f0",
                              color: t.type === "credit" ? "#1f7a3f" : "#a82e2e",
                            }}
                          >
                            {t.type === "credit" ? "↓ Deposit (Credit)" : "↑ Payment (Debit)"}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: t.type === "credit" ? "#1f7a3f" : "#a82e2e" }}>
                            {t.type === "credit" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td style={{ fontSize: "12px", textTransform: "capitalize" }}>
                          {t.category?.replace("_", " ")}
                        </td>
                        <td style={{ fontSize: "13px", color: "#4f5c52" }}>
                          {t.description || "Wallet transaction"}
                        </td>
                        <td>
                          <strong>₹{t.balanceAfter?.toLocaleString("en-IN")}</strong>
                        </td>
                        <td style={{ fontSize: "12px", color: "#6a7b70" }}>
                          {new Date(t.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 8. MEDIA & GALLERY MANAGER SECTION                              */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "media") && (
          <section className="admin-section-block" id="media">
            <div className="section-title-row">
              <div>
                <h2>🖼️ Media & Image Assets Library</h2>
                <p>
                  Upload luxury imagery directly to disk storage (Multer), organize by category, and copy dynamic image URLs to populate suites and website content.
                </p>
              </div>

              <button onClick={loadMedia} className="filter-pill">
                🔄 Refresh Gallery
              </button>
            </div>

            {/* Upload New Image Box */}
            <form
              onSubmit={handleUploadMediaSubmit}
              style={{
                background: "#ffffff",
                padding: "20px",
                borderRadius: "8px",
                border: "1px solid #e7ded2",
                marginBottom: "24px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
                alignItems: "end",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                  SELECT IMAGE (MAX 10MB) *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={mediaFileInputRef}
                  onChange={(e) => setMediaFile(e.target.files[0])}
                  required
                  style={{ fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                  IMAGE TITLE
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oceanfront Horizon Pool"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid #dcd3c5", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                  CATEGORY
                </label>
                <select
                  value={mediaCategory}
                  onChange={(e) => setMediaCategory(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid #dcd3c5", fontSize: "13px", background: "#fff" }}
                >
                  <option value="resort">Resort & Grounds</option>
                  <option value="room">Suite & Room Interior</option>
                  <option value="banner">Promotional Banner</option>
                  <option value="gallery">Public Gallery</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={uploadingMedia}
                  className="primary-button"
                  style={{ width: "100%", padding: "10px 16px", fontSize: "13px" }}
                >
                  {uploadingMedia ? "Uploading..." : "📤 Upload Image"}
                </button>
              </div>
            </form>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              {["all", "resort", "room", "banner", "gallery"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMediaCategoryFilter(cat)}
                  className={`jump-link-btn ${mediaCategoryFilter === cat ? "active" : ""}`}
                  style={{ textTransform: "capitalize", padding: "6px 14px", fontSize: "12px" }}
                >
                  {cat === "all" ? "All Images" : cat}
                </button>
              ))}
            </div>

            {loadingMedia ? (
              <div className="empty-state-box">
                <p>Loading media assets...</p>
              </div>
            ) : mediaList.length === 0 ? (
              <div className="empty-state-box">
                <h3>No Media Files Found</h3>
                <p>Upload your first luxury resort image above to populate the asset library.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "18px" }}>
                {mediaList.map((m) => (
                  <div
                    key={m._id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid #e7ded2",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ position: "relative", height: "140px", background: "#f0ebe2" }}>
                      <img
                        src={resolveImgUrl(m.url)}
                        alt={m.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "rgba(20,34,23,0.8)",
                          color: "#c49d68",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.category}
                      </span>
                    </div>

                    <div style={{ padding: "12px" }}>
                      <strong style={{ fontSize: "13px", display: "block", color: "#142217", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.title}
                      </strong>
                      <div style={{ fontSize: "11px", color: "#8a7c6a", marginBottom: "10px" }}>
                        {(m.size / (1024 * 1024)).toFixed(2)} MB · {new Date(m.createdAt).toLocaleDateString()}
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(m.url);
                            showToast("Image URL copied to clipboard!");
                          }}
                          className="btn-sm-action"
                          style={{ flex: 1, fontSize: "11px", padding: "5px 8px", background: "#fbf6ec", color: "#826231", border: "1px solid #c49d68" }}
                        >
                          📋 Copy URL
                        </button>
                        <button
                          onClick={() => handleDeleteMedia(m._id)}
                          className="btn-sm-action btn-cancel-res"
                          style={{ fontSize: "11px", padding: "5px 8px" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 9. RESORT CONTENT CMS SECTION                                   */}
        {/* ============================================================== */}
        {(activeSection === "all" || activeSection === "cms") && (
          <section className="admin-section-block" id="cms">
            <div className="section-title-row">
              <div>
                <h2>📝 Website Content Management System (CMS)</h2>
                <p>
                  Dynamically customize public headlines, marketing narratives, contact information, and amenities displayed across the Viceroy homepage.
                </p>
              </div>

              <button onClick={loadCms} className="filter-pill">
                🔄 Refresh CMS
              </button>
            </div>

            {loadingCms ? (
              <div className="empty-state-box">
                <p>Loading resort content...</p>
              </div>
            ) : (
              <form
                onSubmit={handleSaveCms}
                style={{
                  background: "#ffffff",
                  padding: "24px",
                  borderRadius: "8px",
                  border: "1px solid #e7ded2",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", marginBottom: "18px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                      RESORT NAME
                    </label>
                    <input
                      type="text"
                      value={cmsContent.resortName || ""}
                      onChange={(e) => setCmsContent({ ...cmsContent, resortName: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                      TAGLINE
                    </label>
                    <input
                      type="text"
                      value={cmsContent.tagline || ""}
                      onChange={(e) => setCmsContent({ ...cmsContent, tagline: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f0ebe2", paddingTop: "18px", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#142217", marginBottom: "12px" }}>
                    Hero Section
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        HERO EYEBROW
                      </label>
                      <input
                        type="text"
                        value={cmsContent.heroEyebrow || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, heroEyebrow: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        HERO MAIN HEADLINE
                      </label>
                      <input
                        type="text"
                        value={cmsContent.heroTitle || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, heroTitle: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                      HERO NARRATIVE / DESCRIPTION
                    </label>
                    <textarea
                      rows="3"
                      value={cmsContent.heroDescription || ""}
                      onChange={(e) => setCmsContent({ ...cmsContent, heroDescription: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f0ebe2", paddingTop: "18px", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#142217", marginBottom: "12px" }}>
                    About Section
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px", marginBottom: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        ABOUT EYEBROW
                      </label>
                      <input
                        type="text"
                        value={cmsContent.aboutEyebrow || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, aboutEyebrow: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        ABOUT TITLE
                      </label>
                      <input
                        type="text"
                        value={cmsContent.aboutTitle || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, aboutTitle: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                      ABOUT DESCRIPTION
                    </label>
                    <textarea
                      rows="3"
                      value={cmsContent.aboutDescription || ""}
                      onChange={(e) => setCmsContent({ ...cmsContent, aboutDescription: e.target.value })}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f0ebe2", paddingTop: "18px", marginBottom: "18px" }}>
                  <h3 style={{ fontSize: "15px", fontFamily: "Georgia, serif", color: "#142217", marginBottom: "12px" }}>
                    Contact & Concierge Information
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        CONCIERGE EMAIL
                      </label>
                      <input
                        type="email"
                        value={cmsContent.contactEmail || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, contactEmail: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        CONCIERGE PHONE
                      </label>
                      <input
                        type="text"
                        value={cmsContent.contactPhone || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, contactPhone: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
                        LOCATION
                      </label>
                      <input
                        type="text"
                        value={cmsContent.contactAddress || ""}
                        onChange={(e) => setCmsContent({ ...cmsContent, contactAddress: e.target.value })}
                        style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingCms}
                  className="primary-button"
                  style={{ padding: "12px 28px", fontSize: "14px" }}
                >
                  {savingCms ? "Saving Changes..." : "💾 Save Website Content Changes"}
                </button>
              </form>
            )}
          </section>
        )}

        {/* ============================================================== */}
        {/* 10. ADMIN PROFILE SECTION                                      */}
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
                        src={resolveImgUrl(photoPreview || adminUser?.profilePhoto)}
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
                      value="Munnar"
                      placeholder="e.g. Munnar"
                      required
                      onChange={(e) =>
                        setNewRoomForm({
                          ...newRoomForm,
                          location: e.target.value,
                        })
                      }
                    />
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
                    <input
                      type="text"
                      disabled
                      value="🟢 Available (Ready for Public Booking)"
                      style={{
                        background: "#f8f6f0",
                        color: "#1e5e31",
                        fontWeight: "600",
                        cursor: "default",
                      }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Suite Photograph</label>
                  <input
                    type="file"
                    ref={suitePhotoInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleSuitePhotoUpload}
                  />
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
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
                      placeholder="/images/home1.png or Image URL"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-upload-photo"
                      onClick={() => suitePhotoInputRef.current?.click()}
                      style={{
                        whiteSpace: "nowrap",
                        padding: "8px 14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      📁 Upload Photo from PC
                    </button>
                  </div>
                  {newRoomForm.image && (
                    <div style={{ marginBottom: "10px" }}>
                      <img
                        src={newRoomForm.image}
                        alt="Suite preview"
                        style={{
                          width: "100%",
                          maxHeight: "130px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
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
                      value="Munnar"
                      placeholder="e.g. Munnar"
                      onChange={(e) =>
                        setEditRoomForm({
                          ...editRoomForm,
                          location: e.target.value,
                        })
                      }
                    />
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
                      <option value="maintenance">🟡 Under Maintenance</option>
                    </select>
                  </div>
                </div>

                {/* Photograph */}
                <div className="form-group">
                  <label>Suite Photograph</label>
                  <input
                    type="file"
                    ref={editSuitePhotoInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleEditSuitePhotoUpload}
                  />
                  <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
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
                      style={{ flex: 1 }}
                      placeholder="/images/home1.png or image URL"
                    />
                    <button
                      type="button"
                      className="btn-upload-photo"
                      onClick={() => editSuitePhotoInputRef.current?.click()}
                      style={{
                        whiteSpace: "nowrap",
                        padding: "8px 14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      📁 Upload Photo from PC
                    </button>
                  </div>
                  {editRoomForm.image && (
                    <div style={{ marginBottom: "10px" }}>
                      <img
                        src={editRoomForm.image}
                        alt="Suite preview"
                        style={{
                          width: "100%",
                          maxHeight: "130px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="preset-photo-buttons">
                    <span style={{ fontSize: "11px", color: "#666" }}>Presets:</span>
                    <button
                      type="button"
                      className="photo-chip"
                      onClick={() =>
                        setEditRoomForm((p) => ({ ...p, image: "/images/viceroy-bedroom.jpg" }))
                      }
                    >
                    Highland Family Villa
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

      {/* Admin Wallet Adjustment Modal */}
      {adjustWalletModal.open && (
        <div className="modal-overlay" onClick={() => setAdjustWalletModal({ open: false, user: null, amount: "", type: "credit", description: "" })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">ADMINISTRATIVE ACTION</span>
                <h3>👛 Adjust User Wallet Balance</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setAdjustWalletModal({ open: false, user: null, amount: "", type: "credit", description: "" })}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustWalletSubmit} className="modal-form">
              <div style={{ background: "#fbf6ec", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #c49d68" }}>
                <div><strong>User:</strong> {adjustWalletModal.user?.fullName} ({adjustWalletModal.user?.email})</div>
                <div style={{ marginTop: "4px" }}>
                  <strong>Current Balance:</strong> ₹{(adjustWalletModal.user?.walletBalance || 0).toLocaleString("en-IN")}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label>Action Type</label>
                <select
                  value={adjustWalletModal.type}
                  onChange={(e) => setAdjustWalletModal({ ...adjustWalletModal, type: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                >
                  <option value="credit">➕ Credit (Add funds to user wallet)</option>
                  <option value="debit">➖ Debit (Deduct funds from user wallet)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={adjustWalletModal.amount}
                  onChange={(e) => setAdjustWalletModal({ ...adjustWalletModal, amount: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Reason / Audit Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP courtesy credit, resolution refund"
                  value={adjustWalletModal.description}
                  onChange={(e) => setAdjustWalletModal({ ...adjustWalletModal, description: e.target.value })}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid #dcd3c5" }}
                />
              </div>

              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setAdjustWalletModal({ open: false, user: null, amount: "", type: "credit", description: "" })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="primary-button"
                  style={{ padding: "10px 20px" }}
                >
                  {submittingAdjust ? "Applying..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal (No JS alert/confirm) */}
      {confirmModal.isOpen && (
        <div className="modal-overlay" onClick={closeConfirmModal}>
          <div
            className="modal-card custom-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-modal-header">
              <div className={`confirm-icon-badge ${confirmModal.confirmType}`}>
                {confirmModal.icon}
              </div>
              <div className="confirm-title-area">
                <span className="confirm-tagline">Administrative Action</span>
                <h3>{confirmModal.title}</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={closeConfirmModal}
              >
                ✕
              </button>
            </div>

            <div className="confirm-modal-body">
              <p className="confirm-body-text">{confirmModal.message}</p>
            </div>

            <div className="confirm-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={closeConfirmModal}
              >
                Never Mind
              </button>
              <button
                type="button"
                className={`btn-modal-action ${confirmModal.confirmType === "danger" ? "btn-danger" : "btn-gold"}`}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && <div className="toast-notice">{toast}</div>}
    </div>
  );
}

export default AdminDashboard;
