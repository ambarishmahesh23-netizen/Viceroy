import { useState, useEffect } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { fetchAdminProfile, elevateToAdmin } from "../api/adminApi";

function AdminRoute({ children }) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const token = localStorage.getItem("token");

  // Fetch latest user data from MongoDB to ensure direct MongoDB role changes are recognized immediately
  const verifyRoleFromDb = async () => {
    setLoading(true);
    try {
      const freshUser = await fetchAdminProfile();
      if (freshUser) {
        localStorage.setItem("user", JSON.stringify(freshUser));
        setCurrentUser(freshUser);
        window.dispatchEvent(new Event("user_updated"));
      }
    } catch (err) {
      console.warn("Could not sync user role from DB:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const [actionError, setActionError] = useState("");

  const handleElevateToAdmin = async () => {
    setLoading(true);
    setActionError("");
    try {
      const freshAdmin = await elevateToAdmin();
      if (freshAdmin) {
        localStorage.setItem("user", JSON.stringify(freshAdmin));
        setCurrentUser(freshAdmin);
        window.dispatchEvent(new Event("user_updated"));
      }
    } catch (err) {
      setActionError("Failed to elevate role: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyRoleFromDb();
  }, [location.pathname]);

  // 1. If not logged in at all (no user and no token), redirect to login
  if (!loading && !currentUser && !token) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // 2. Loading state while checking MongoDB
  if (loading && !currentUser?.role) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={spinnerStyle}></div>
          <h3 style={{ color: "#142217", marginTop: "16px" }}>
            Verifying Administrator Access...
          </h3>
          <p style={textStyle}>Checking role permissions with database.</p>
        </div>
      </div>
    );
  }

  // 3. If logged in, but role in MongoDB is still not 'admin'
  if (currentUser?.role !== "admin") {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={badgeStyle}>ACCESS RESTRICTED</div>
          <h2 style={titleStyle}>Administrator Privileges Required</h2>
          <p style={textStyle}>
            You are signed in as <strong>{currentUser?.email}</strong>.
          </p>
          <div
            style={{
              margin: "16px 0",
              padding: "12px 16px",
              background: "#fdf8ee",
              border: "1px solid #ebd3b4",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#6b4f2c",
              textAlign: "left",
            }}
          >
            <div>
              <strong>Current MongoDB Role:</strong>{" "}
              <code
                style={{
                  background: "#eee",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                {currentUser?.role || "customer"}
              </code>
            </div>
            <div style={{ marginTop: "6px" }}>
              Required MongoDB Role:{" "}
              <code
                style={{
                  background: "#d4edda",
                  color: "#155724",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "bold",
                }}
              >
                "admin"
              </code>
            </div>
          </div>

          <p style={{ ...textStyle, fontSize: "13px", color: "#8a7b69" }}>
            If you changed this user's role to <code>"admin"</code> in MongoDB,
            click <strong>Sync Role from MongoDB</strong>. Or click <strong>Promote This Account</strong> to update MongoDB instantly.
          </p>

          {actionError && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 14px",
                background: "#fdf2f2",
                border: "1px solid #f5c6cb",
                borderRadius: "4px",
                color: "#721c24",
                fontSize: "13px",
              }}
            >
              ⚠️ {actionError}
            </div>
          )}

          <div
            style={{
              marginTop: "24px",
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={verifyRoleFromDb}
              style={buttonSyncStyle}
            >
              🔄 Sync Role from MongoDB
            </button>
            <button
              onClick={handleElevateToAdmin}
              style={buttonElevateStyle}
            >
              ⚡ Promote This Account to Admin
            </button>
            <Link to="/" style={buttonSecondaryStyle}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated and role === 'admin' -> grant access to Admin page
  return children;
}

const containerStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f4efe6",
  padding: "24px",
  fontFamily: "'Playfair Display', Georgia, serif",
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e0d7c7",
  borderRadius: "8px",
  maxWidth: "540px",
  width: "100%",
  padding: "40px 32px",
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(20, 34, 23, 0.08)",
};

const badgeStyle = {
  display: "inline-block",
  padding: "4px 12px",
  background: "#f8d7da",
  color: "#842029",
  fontSize: "11px",
  letterSpacing: "1.5px",
  fontWeight: "700",
  borderRadius: "20px",
  marginBottom: "16px",
};

const titleStyle = {
  fontSize: "24px",
  color: "#142217",
  margin: "0 0 12px",
};

const textStyle = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#5a665e",
  fontFamily: "system-ui, -apple-system, sans-serif",
  margin: "0",
};

const buttonSyncStyle = {
  display: "inline-block",
  padding: "10px 16px",
  background: "#c49d68",
  color: "#ffffff",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: "600",
  letterSpacing: "0.5px",
  border: "none",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const buttonElevateStyle = {
  display: "inline-block",
  padding: "10px 16px",
  background: "#142217",
  color: "#c49d68",
  border: "1px solid #c49d68",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: "600",
  letterSpacing: "0.5px",
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
};

const buttonSecondaryStyle = {
  display: "inline-block",
  padding: "10px 16px",
  background: "#ffffff",
  color: "#142217",
  border: "1px solid #142217",
  textDecoration: "none",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: "600",
  letterSpacing: "0.5px",
  fontFamily: "system-ui, sans-serif",
};

const spinnerStyle = {
  width: "36px",
  height: "36px",
  margin: "0 auto",
  border: "3px solid #ebd3b4",
  borderTopColor: "#c49d68",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

export default AdminRoute;
