import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Booking from "./pages/Booking";
import BookingConfirmation from "./pages/BookingConfirmation";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "518407008116-koct3ov4upo3c0hqb7k1r0p02iug2dva.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Customer Profile & Booking History (Module 9 - Login Required) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Protected Booking Flow (Requires Login) */}
          <Route
            path="/booking"
            element={
              <ProtectedRoute>
                <Booking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/confirmation"
            element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/confirmation/:id"
            element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Portal (Requires role: 'admin' in MongoDB) */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
