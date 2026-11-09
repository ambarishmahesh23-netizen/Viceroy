import React from "react";
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const token = localStorage.getItem("token");

  if (!user && !token) {
    // Redirect to login with return path
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}

export default ProtectedRoute;
