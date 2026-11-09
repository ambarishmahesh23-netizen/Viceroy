import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import { logoutUser } from "../api/authApi";
import { submitPublicEnquiry, fetchPublishedReviews, fetchRooms, fetchAdminProfile } from "../api/adminApi";

const defaultRooms = [
  {
    name: "Travertine Ocean Horizon Pavilion",
    location: "Maldives Horizon Coast",
    totalRooms: 4,
    category: "SANCTUARY SUITE MASTER QUARTERS",
    tag: "PANORAMIC OCEANFRONT",
    image: "/images/viceroy-bedroom.jpg",
    pricePerNight: 15000,
    description: "Panoramic oceanfront suite with 4 private rooms, private soaking terrace & daybed",
  },
  {
    name: "Private Garden Sanctuary",
    location: "Bali Tropical Botanical Valley",
    totalRooms: 4,
    category: "PRIVATE WELLNESS RETREAT",
    tag: "GARDEN VIEWS",
    image: "/images/viceroy-bath.jpg",
    pricePerNight: 10000,
    description: "Restorative wellness bath rituals within lush botanical tropical flora across 4 luxury rooms",
  },
  {
    name: "Architectural Coastal Residence",
    location: "Phuket Azure Peninsula",
    totalRooms: 4,
    category: "PRIVATE RESIDENCE",
    tag: "EXCLUSIVE LIVING",
    image: "/images/viceroy-villa.jpg",
    pricePerNight: 25000,
    description: "Multi-level private estate featuring 4 oceanfront rooms with infinity plunge pool & personal butler",
  },
];

function Home() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // After login, users are not kept on Home & Contact - automatically redirect to booking / admin
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/booking", { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setCurrentUser(null);
    window.dispatchEvent(new Event("user_updated"));
    window.location.href = "/";
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [roomsList, setRoomsList] = useState(defaultRooms);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    suite: defaultRooms[0].name,
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Sync fresh profile from DB on mount and listen to user updates
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

  useEffect(() => {
    fetchPublishedReviews()
      .then((data) => {
        if (data?.reviews) setReviews(data.reviews);
      })
      .catch((err) => console.warn("Could not load reviews:", err.message));

    fetchRooms()
      .then((data) => {
        if (data?.rooms && data.rooms.length > 0) {
          setRoomsList(data.rooms);
        }
      })
      .catch((err) => console.warn("Using default luxury suites:", err.message));
  }, []);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await submitPublicEnquiry({
        firstName: form.firstName,
        lastName: form.lastName,
        emailAddress: form.email,
        phoneNumber: form.phone,
        suitePreference: form.suite,
        remarks: form.message,
      });

      setFeedback({
        type: "success",
        message: "Thank you! Your concierge inquiry has been received. Our team will review and reply to your email shortly.",
      });

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        suite: defaultRooms[0].name,
        message: "",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to submit inquiry. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="viceroy">
      {/* Admin Mode Top Notice Bar */}
      {currentUser?.role === "admin" && (
        <aside
          style={{
            background: "#142217",
            color: "#e8dcce",
            padding: "9px 24px",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #c49d68",
            position: "sticky",
            top: 0,
            zIndex: 1100,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#c49d68", fontSize: "14px" }}>🛡️</span>
            <span>
              <strong>Viewing Public Site as Admin:</strong> Contact form, guest booking, and customer stays are disabled.
            </span>
          </div>
          <a
            href="/admin"
            style={{
              color: "#c49d68",
              fontWeight: "700",
              textDecoration: "none",
              border: "1px solid #c49d68",
              padding: "4px 12px",
              borderRadius: "4px",
              fontSize: "11px",
              letterSpacing: "0.5px",
            }}
          >
            ← Back to Admin Panel
          </a>
        </aside>
      )}

      {/* Navigation */}
      <header className="site-header">
        <a className="brand" href="#home">
          Viceroy<span>.</span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          ☰
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#rooms" onClick={() => setMenuOpen(false)}>Suites</a>
          {currentUser?.role !== "admin" && (
            <a href="/booking">Book Residence</a>
          )}
          <a href="#reviews" onClick={() => setMenuOpen(false)}>Reviews</a>
          {currentUser?.role !== "admin" && (
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          )}
          {currentUser && currentUser?.role !== "admin" && (
            <a href="/profile" style={{ color: "#c49d68", fontWeight: "600" }}>
              My Stays
            </a>
          )}
          {currentUser?.role === "admin" && (
            <a
              href="/admin"
              style={{
                color: "#c49d68",
                fontWeight: "bold",
                border: "1px solid #c49d68",
                padding: "3px 10px",
                borderRadius: "4px",
              }}
            >
              ⚙️ Admin Panel
            </a>
          )}
        </nav>

        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {currentUser.role === "admin" && (
              <a
                href="/admin"
                className="login-button"
                style={{
                  background: "#142217",
                  color: "#c49d68",
                  border: "1px solid #c49d68",
                  fontSize: "12px",
                  padding: "8px 14px",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                ⚙️ Admin Panel
              </a>
            )}

            <a
              href={currentUser?.role === "admin" ? "/admin" : "/profile"}
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
              <span>👤</span>
              <span>{currentUser.fullName || currentUser.email}</span>
              {currentUser.role === "admin" && (
                <span
                  style={{
                    background: "#c49d68",
                    color: "#ffffff",
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
            </a>

            <button
              onClick={handleLogout}
              className="login-button"
              style={{
                background: "transparent",
                border: "1px solid #241916",
                cursor: "pointer",
                color: "#241916",
                fontSize: "12px",
                padding: "8px 14px",
                fontWeight: "600",
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a className="login-button" href="/login">
              Login
            </a>
            <a
              href="/signup"
              style={{
                textDecoration: "none",
                fontSize: "13px",
                color: "#142217",
                fontWeight: "600",
                padding: "7px 14px",
              }}
            >
              Register
            </a>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow light">EXCLUSIVE COASTAL SANCTUARY</span>
            <h1>Where Luxury Meets the Horizon</h1>
            <p>
              Experience untamed coastal elegance, secluded private residences,
              and deeply restorative wellness spaces beside the ocean.
            </p>
            <div className="hero-actions">
              {currentUser?.role === "admin" ? (
                <>
                  <a href="#rooms" className="primary-button">
                    Explore Luxury Suites
                  </a>
                  <a href="/admin" className="secondary-button">
                    ⚙️ Return to Admin Operations
                  </a>
                </>
              ) : (
                <>
                  <a href="/booking" className="primary-button">
                    Reserve Your Stay
                  </a>
                  <a href="#contact" className="secondary-button">
                    Concierge Inquiry
                  </a>
                </>
              )}
            </div>
          </div>
        </section>

        {/* About section */}
        <section className="about section" id="about">
          <div className="section-header">
            <span className="eyebrow">A TIMELESS REFUGE</span>
            <h2>Crafted for serenity, immersed in nature.</h2>
            <p>
              Viceroy Resort harmonizes organic architectural lines with panoramic ocean vistas, creating a private retreat where refined hospitality and coastal tranquility converge.
            </p>
          </div>
        </section>

        {/* Accommodations & Residences */}
        <section className="accommodations section" id="rooms">
          <div className="section-heading">
            <span className="eyebrow">RESIDENCES & SANCTUARIES</span>
            <h2>Private oceanfront living, curated for restorative ease.</h2>
            <div className="ornament" />
            <p className="section-description">
              Each residence at Viceroy is an architectural tribute to the coastal elements—featuring panoramic ocean vistas, private terraces, deep soaking baths, and bespoke concierge care.
            </p>
          </div>

          <div className="room-grid">
            {roomsList.map((room, index) => {
              const imageSrc =
                room.image ||
                defaultRooms[index % defaultRooms.length]?.image ||
                "/images/home1.png";

              return (
                <article
                  key={room._id || room.name}
                  className={`room-card room-card-${(index % 3) + 1}`}
                >
                  <img
                    src={imageSrc}
                    alt={room.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/images/home1.png";
                    }}
                  />

                  <div className="room-overlay">
                    <div>
                      <span className="eyebrow light">
                        {room.category || "LUXURY SUITE"}
                      </span>
                      <h3>{room.name}</h3>
                      <div style={{ fontSize: "12px", color: "#c49d68", margin: "4px 0", letterSpacing: "0.5px" }}>
                        📍 {room.location || "Coastal Sanctuary"} · 🚪 {room.totalRooms || 4} Rooms Suite
                      </div>
                      {room.pricePerNight && (
                        <p className="room-price-tag">
                          ₹{Number(room.pricePerNight).toLocaleString("en-IN")} / night
                        </p>
                      )}
                    </div>

                    <div className="room-action-col">
                      <span className="room-tag">
                        {room.tag || (room.status === "available" ? "AVAILABLE" : "RESERVED")}
                      </span>
                      {currentUser?.role !== "admin" && (
                        <a href="/booking" className="room-book-btn">
                          Explore & Reserve →
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {currentUser?.role !== "admin" && (
            <a href="/booking" className="outline-button">
              Explore All Accommodations & Book →
            </a>
          )}
        </section>

        {/* Experience banner */}
        <section className="experience section">
          <div className="experience-content">
            <span className="eyebrow light">THE ART OF SLOW LIVING</span>
            <h2>Your time, beautifully uninterrupted.</h2>
            <p>
              Reconnect with nature through private wellness experiences, restorative spaces, and personalized resort hospitality.
            </p>
            <a href="#contact" className="primary-button">
              Plan Your Stay →
            </a>
          </div>
        </section>

        {/* Reviews and Ratings Module (Module 8) */}
        <section className="reviews section" id="reviews" style={{ padding: "60px 24px", maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header" style={{ textAlign: "center", marginBottom: "40px" }}>
            <span className="eyebrow">GUEST EXPERIENCES & REVIEWS</span>
            <h2>Timeless memories shared by our distinguished guests.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
            {(reviews.length > 0 ? reviews : [
              {
                _id: "1",
                userName: "Lady Claire Harrington",
                suiteName: "Travertine Ocean Horizon Pavilion",
                rating: 5,
                title: "An unhurried coastal paradise",
                comment: "The panoramic horizon vistas and soothing travertine bath rituals made our weekend unforgettable. The personalized concierge care was exemplary.",
              },
              {
                _id: "2",
                userName: "Marcus Sterling",
                suiteName: "Architectural Coastal Residence",
                rating: 5,
                title: "Unrivaled architectural sanctuary",
                comment: "Private beach access and the infinity plunge pool were perfection. Every detail from the linen textures to sunset dining exceeded our expectations.",
              },
              {
                _id: "3",
                userName: "Ananya Deshmukh",
                suiteName: "Private Garden Sanctuary",
                rating: 5,
                title: "Deeply restorative wellness escape",
                comment: "Waking up to tropical botanical gardens and the ocean breeze was sublime. Can't wait to return next winter.",
              }
            ]).map((rev) => (
              <div
                key={rev._id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e7ded2",
                  borderRadius: "8px",
                  padding: "24px",
                  boxShadow: "0 4px 15px rgba(20, 34, 23, 0.05)",
                }}
              >
                <div style={{ color: "#c49d68", fontSize: "18px", marginBottom: "8px" }}>
                  {"★".repeat(rev.rating)}
                </div>
                <h4 style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#142217", margin: "0 0 6px" }}>
                  "{rev.title}"
                </h4>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#4f5c52", margin: "0 0 16px" }}>
                  {rev.comment}
                </p>
                <div style={{ borderTop: "1px solid #f0ebe2", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8a7c6a" }}>
                  <strong>{rev.userName}</strong>
                  <span>{rev.suiteName}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact / Concierge Inquiry form (Module 19) - Hidden for Admin View */}
        {currentUser?.role !== "admin" && (
          <section className="contact section" id="contact">
            <div className="contact-intro">
              <span className="eyebrow">PERSONALIZED HOSPITALITY</span>
              <h2>Concierge Inquiry</h2>

              <p>
                Whether you are planning a private escape or need assistance arranging your stay, our concierge team is ready to help. Submit your requirements below, and we will reply directly to your email.
              </p>

              <div className="contact-detail">
                <span>EMAIL</span>
                <p>concierge@viceroyresort.com</p>
              </div>

              <div className="contact-detail">
                <span>EXPERIENCES</span>
                <p>Private stays and bespoke itineraries</p>
              </div>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <h3>Concierge Inquiry Form</h3>

              {feedback && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    marginBottom: "16px",
                    background: feedback.type === "success" ? "#eaf6ee" : "#fdf0f0",
                    color: feedback.type === "success" ? "#1f7a3f" : "#a82e2e",
                    border: `1px solid ${feedback.type === "success" ? "#bfe5cc" : "#f5c6cb"}`,
                  }}
                >
                  {feedback.message}
                </div>
              )}

              <div className="form-grid">
                <label>
                  FIRST NAME *
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Your first name"
                    required
                  />
                </label>

                <label>
                  LAST NAME *
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Your last name"
                    required
                  />
                </label>

                <label>
                  EMAIL ADDRESS *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label>
                  PHONE NUMBER
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Your phone number"
                  />
                </label>

                <label className="full-width">
                  SUITE PREFERENCE
                  <select
                    name="suite"
                    value={form.suite}
                    onChange={handleChange}
                  >
                    {roomsList.map((room) => (
                      <option key={room.name} value={room.name}>
                        {room.name}
                      </option>
                    ))}
                    <option value="Presidential Suite">Presidential Suite</option>
                    <option value="Royal Beach Villa">Royal Beach Villa</option>
                  </select>
                </label>

                <label className="full-width">
                  YOUR REQUIREMENTS
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us about your dates, party size, or special celebrations..."
                    rows="5"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? "Submitting Inquiry..." : "Send Your Inquiry →"}
              </button>
            </form>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <a className="brand" href="#home">
          Viceroy<span>.</span>
        </a>

        <p>Exceptional stays. Timeless memories.</p>

        <div>
          <a href="#home">Home</a>
          {currentUser?.role !== "admin" && (
            <>
              <a href="/booking">Book Residence</a>
              <a href="/profile">My Account</a>
              <a href="#contact">Contact</a>
            </>
          )}
          {currentUser?.role === "admin" && (
            <a href="/admin" style={{ color: "#c49d68", fontWeight: "600" }}>
              Admin Operations
            </a>
          )}
        </div>

        <small>© {new Date().getFullYear()} Viceroy Resort.</small>
      </footer>
    </div>
  );
}

export default Home;
