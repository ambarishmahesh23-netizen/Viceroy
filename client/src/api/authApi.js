const API_URL = "http://localhost:4000/api/auth";

// 1. Check if an email is already registered
export const checkEmailExists = async (email) => {
  const response = await fetch(`${API_URL}/check-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to check email");
  }

  return data;
};

// 2. Send OTP for signup
export const sendSignupOtp = async ({ fullName, email, password }) => {
  const response = await fetch(`${API_URL}/signup/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fullName, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to send OTP");
    error.isRegistered = data.isRegistered || false;
    error.status = response.status;
    throw error;
  }

  return data;
};

// 3. Verify OTP, register & log user in
export const verifySignupOtp = async ({ email, otp }) => {
  const response = await fetch(`${API_URL}/signup/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, otp }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to verify OTP");
    error.isRegistered = data.isRegistered || false;
    error.status = response.status;
    throw error;
  }

  return data;
};

// 4. Direct registration (fallback)
export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Registration failed");
    error.isRegistered = data.isRegistered || false;
    error.status = response.status;
    throw error;
  }

  return data;
};

// 5. Login user
export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
};

// 6. Logout user
export const logoutUser = async () => {
  try {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout request failed:", err);
  } finally {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
};

// 7. Send Forgot Password OTP
export const sendForgotPasswordOtp = async (email) => {
  const response = await fetch(`${API_URL}/forgot-password/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to send reset code");
  }

  return data;
};

// 8. Reset Password with OTP
export const resetPasswordWithOtp = async ({ email, otp, newPassword }) => {
  const response = await fetch(`${API_URL}/forgot-password/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp, newPassword }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to reset password");
  }

  return data;
};

// 9. Google Login and Signup
export const googleLoginApi = async (credential) => {
  const response = await fetch(`${API_URL}/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ credential }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Google authentication failed");
  }

  return data;
};
