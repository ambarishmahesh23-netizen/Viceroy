import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { logoutUser } from "../api/authApi";
import { fetchAdminProfile } from "../api/adminApi";
import "./Navbar.css";

function Navbar() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Sync user from backend on mount so MongoDB role updates reflect immediately
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchAdminProfile()
        .then((freshUser) => {
          if (freshUser) {
            localStorage.setItem("user", JSON.stringify(freshUser));
            setCurrentUser(freshUser);
          }
        })
        .catch(() => {});
    }

    const handleUserUpdate = () => {
      try {
        const stored = localStorage.getItem("user");
        setCurrentUser(stored ? JSON.parse(stored) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener("user_updated", handleUserUpdate);
    return () => window.removeEventListener("user_updated", handleUserUpdate);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setCurrentUser(null);
    window.dispatchEvent(new Event("user_updated"));
    window.location.href = "/";
  };

  return (
    <header className="navbar">
      <Link
        to={currentUser ? (currentUser.role === "admin" ? "/admin" : "/booking") : "/"}
        className="navbar-logo"
      >
        VICEROY
      </Link>

      <nav className="navbar-links">
        {!currentUser && (
          <a href="/" className="active">Home</a>
        )}
        {currentUser?.role !== "admin" && (
          <Link to="/booking">Book Residence</Link>
        )}
        {!currentUser && (
          <a href="/#contact">Contact</a>
        )}
        {currentUser && currentUser.role !== "admin" && (
          <Link to="/profile" style={{ color: "#142217", fontWeight: "600" }}>
            My Stays & Profile
          </Link>
        )}
        {currentUser?.role === "admin" && (
          <Link
            to="/admin"
            style={{
              color: "#c49d68",
              fontWeight: "700",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontSize: "12px",
              border: "1px solid #c49d68",
              padding: "4px 10px",
              borderRadius: "4px",
            }}
          >
            ⚙️ Admin Panel
          </Link>
        )}
      </nav>

      {currentUser ? (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {currentUser.role === "admin" && (
            <Link
              to="/admin"
              className="login-button"
              style={{
                background: "#142217",
                color: "#c49d68",
                border: "1px solid #c49d68",
                fontSize: "12px",
                padding: "6px 12px",
              }}
            >
              Admin Dashboard
            </Link>
          )}

          {currentUser.role !== "admin" && (
            <Link
              to="/profile"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                background: "#fbf6ec",
                border: "1px solid #dfd3bd",
                borderRadius: "20px",
                fontSize: "12.5px",
                color: "#142217",
                fontWeight: "600",
              }}
              title="Viceroy Guest Wallet Balance"
            >
              <span>💳</span>
              <span>₹{(currentUser.walletBalance || 0).toLocaleString("en-IN")}</span>
            </Link>
          )}

          <Link
            to={currentUser.role === "admin" ? "/admin" : "/profile"}
            style={{
              textDecoration: "none",
              fontSize: "13px",
              color: "#142217",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              background: "#f4efe6",
              border: "1px solid #dcd3c5",
              borderRadius: "4px",
              letterSpacing: "0.4px",
            }}
          >
            {currentUser.profilePhoto ? (
              <img
                src={currentUser.profilePhoto}
                alt={currentUser.fullName || "User"}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "inline-block",
                  border: "1.5px solid #c49d68",
                }}
              />
            ) : (
              <span>👤</span>
            )}
            <span>{currentUser.fullName || currentUser.email}</span>
            {currentUser.role === "admin" && (
              <span
                style={{
                  background: "#c49d68",
                  color: "#fff",
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                }}
              >
                Admin
              </span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid #d4c8b8",
              padding: "6px 14px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              color: "#6b5844",
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link to="/login" className="login-button">
            Sign In
          </Link>
          <Link
            to="/signup"
            style={{
              textDecoration: "none",
              fontSize: "13px",
              color: "#142217",
              fontWeight: "600",
              padding: "6px 12px",
            }}
          >
            Register
          </Link>
        </div>
      )}
    </header>
  );
}

export default Navbar;
