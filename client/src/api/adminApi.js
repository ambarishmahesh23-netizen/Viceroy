const BASE_URL = "http://localhost:4000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// 1. Fetch Room and Enquiry Overview Statistics
export const fetchDashboardStats = async () => {
  const response = await fetch(`${BASE_URL}/rooms/stats`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load statistics");
  }
  return data.stats;
};

// 2. Fetch Rooms with optional status/search filters
export const fetchRooms = async ({ status = "all", search = "", category = "all" } = {}) => {
  const params = new URLSearchParams();
  if (status && status !== "all") params.append("status", status);
  if (search && search.trim()) params.append("search", search.trim());
  if (category && category !== "all") params.append("category", category);

  const response = await fetch(`${BASE_URL}/rooms?${params.toString()}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch rooms");
  }
  return data.rooms || [];
};

// 3. Create a new room
export const createRoom = async (roomData) => {
  const response = await fetch(`${BASE_URL}/rooms`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(roomData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to create room");
  }
  return data;
};

// 4. Update room details
export const updateRoom = async (id, roomData) => {
  const response = await fetch(`${BASE_URL}/rooms/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(roomData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update room");
  }
  return data;
};

// 5. Toggle room status (Available <-> Booked)
export const toggleRoomStatus = async (id, status = null) => {
  const response = await fetch(`${BASE_URL}/rooms/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(status ? { status } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to toggle room status");
  }
  return data;
};

// 6. Delete a room
export const deleteRoom = async (id) => {
  const response = await fetch(`${BASE_URL}/rooms/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete room");
  }
  return data;
};

// 7. Fetch all inquiries
export const fetchEnquiries = async ({ status = "all", search = "" } = {}) => {
  const params = new URLSearchParams();
  if (status && status !== "all") params.append("status", status);
  if (search && search.trim()) params.append("search", search.trim());

  const response = await fetch(`${BASE_URL}/enquiries?${params.toString()}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch enquiries");
  }
  return data;
};

// 8. Reply to an inquiry (sends email & saves reply in DB)
export const replyToEnquiry = async (id, { replyMessage, replySubject }) => {
  const response = await fetch(`${BASE_URL}/enquiries/${id}/reply`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ replyMessage, replySubject }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to send reply");
  }
  return data;
};

// 9. Delete an inquiry
export const deleteEnquiry = async (id) => {
  const response = await fetch(`${BASE_URL}/enquiries/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete enquiry");
  }
  return data;
};

// 10. Public submit enquiry (from home page, NO LOGIN required)
export const submitPublicEnquiry = async (enquiryData) => {
  const response = await fetch(`${BASE_URL}/enquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(enquiryData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit enquiry");
  }
  return data;
};

// 11. Create Booking (login required)
export const createBookingReservation = async (bookingData) => {
  const response = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(bookingData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to complete reservation");
  }
  return data.booking;
};

// 12. Fetch Booking by ID or Reference
export const fetchBookingById = async (id) => {
  const response = await fetch(`${BASE_URL}/bookings/${id}`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch reservation");
  }
  return data.booking;
};

// 13. Fetch all bookings (Admin only)
export const fetchAllBookings = async () => {
  const response = await fetch(`${BASE_URL}/bookings`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch bookings");
  }
  return data.bookings || [];
};

// 14. Fetch Admin / User Profile
export const fetchAdminProfile = async () => {
  const response = await fetch(`${BASE_URL}/auth/me`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch profile");
  }
  return data.user;
};

// 14b. Fetch User Wallet Details
export const fetchWalletDetails = async () => {
  const response = await fetch(`${BASE_URL}/auth/wallet`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch wallet");
  }
  return data;
};

// 15. Update Admin Profile
export const updateAdminProfile = async (profileData) => {
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(profileData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update profile");
  }
  return data;
};

// 16. Update Admin Password
export const updateAdminPassword = async (passwordData) => {
  const response = await fetch(`${BASE_URL}/auth/update-password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(passwordData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to update password");
  }
  return data;
};

// 17. Fetch Customer's Own Bookings (Module 9 & 10)
export const fetchMyBookings = async () => {
  const response = await fetch(`${BASE_URL}/bookings/my`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch bookings");
  }
  return data.bookings || [];
};

// 18. Cancel Booking (Module 10)
export const cancelBooking = async (id, reason = "") => {
  const response = await fetch(`${BASE_URL}/bookings/${id}/cancel`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to cancel booking");
  }
  return data;
};

// 19. Check-in Guest (Module 11)
export const checkInGuest = async (id) => {
  const response = await fetch(`${BASE_URL}/bookings/${id}/check-in`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to check in guest");
  }
  return data;
};

// 20. Check-out Guest (Module 11)
export const checkOutGuest = async (id) => {
  const response = await fetch(`${BASE_URL}/bookings/${id}/check-out`, {
    method: "PUT",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to check out guest");
  }
  return data;
};

// 21. Check Room Availability for Date Range (Module 4)
export const checkDateRangeAvailability = async (checkIn, checkOut, category = "all") => {
  const params = new URLSearchParams({ checkIn, checkOut });
  if (category && category !== "all") params.append("category", category);

  const response = await fetch(`${BASE_URL}/rooms/check-availability?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to check date availability");
  }
  return data;
};

// 22. Fetch Published Reviews (Module 8)
export const fetchPublishedReviews = async () => {
  const response = await fetch(`${BASE_URL}/reviews`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch reviews");
  }
  return data;
};

// 23. Submit Review (Module 8)
export const submitReview = async (reviewData) => {
  const response = await fetch(`${BASE_URL}/reviews`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(reviewData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit review");
  }
  return data;
};

// 24. Fetch Admin Reviews for Moderation
export const fetchAdminReviews = async () => {
  const response = await fetch(`${BASE_URL}/reviews/admin`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to load reviews");
  }
  return data.reviews || [];
};

// 25. Moderate Review Status
export const moderateReviewStatus = async (id, status) => {
  const response = await fetch(`${BASE_URL}/reviews/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to moderate review");
  }
  return data;
};

// 26. Delete Review
export const deleteReview = async (id) => {
  const response = await fetch(`${BASE_URL}/reviews/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to delete review");
  }
  return data;
};


// 27. Elevate logged-in account to admin
export const elevateToAdmin = async () => {
  const response = await fetch(`${BASE_URL}/auth/make-admin`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to elevate role to admin");
  }
  return data.user;
};

// 28. Load Razorpay Checkout SDK Script Dynamically
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// 29. Fetch Razorpay public key
export const fetchRazorpayKey = async () => {
  const response = await fetch(`${BASE_URL}/payments/razorpay/key`, {
    headers: getAuthHeaders(),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch Razorpay key");
  }
  return data;
};

// 30. Create Razorpay Order
export const createRazorpayOrder = async (orderData) => {
  const response = await fetch(`${BASE_URL}/payments/razorpay/order`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(orderData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to create Razorpay order");
  }
  return data;
};

// 31. Verify Razorpay Payment Signature
export const verifyRazorpayPayment = async (verificationData) => {
  const response = await fetch(`${BASE_URL}/payments/razorpay/verify`, {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(verificationData),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to verify Razorpay payment");
  }
  return data;
};

