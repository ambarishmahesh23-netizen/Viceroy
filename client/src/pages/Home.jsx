import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";
import { logoutUser } from "../api/authApi";
import {
  submitPublicEnquiry,
  fetchPublishedReviews,
  fetchRooms,
  fetchAdminProfile,
  fetchResortContentApi,
} from "../api/adminApi";

const resolveImgUrl = (url) => {
  if (!url) return "/images/home1.png";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `http://localhost:4000${url}`;
  return url;
};

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
  const [roomsList, setRoomsList] = useState([]);
  const [content, setContent] = useState({
    resortName: "Viceroy Resort Munnar",
    tagline: "A Mist-Clad Highland Sanctuary in Munnar",
    heroEyebrow: "🌿 MIST-CLAD HIGHLAND RETREAT · MUNNAR, KERALA (5,200 FT)",
    heroTitle: "Where the Clouds Embrace the Tea Hills",
    heroDescription:
      "Perched 5,200 feet above sea level amidst Munnar's undulating tea estates, Viceroy Resort blends colonial architectural elegance with panoramic misty valleys, tea estate walkways, private balconies, and restorative mountain tranquility.",
    heroBannerImage: "/images/frontview.png",
    aboutEyebrow: "HIGH-ALTITUDE SERENITY",
    aboutTitle: "Crafted for peaceful reflection, immersed in Munnar's tea hills.",
    aboutDescription:
      "Viceroy Resort Munnar harmonizes contemporary luxury with the natural contour of the Western Ghats—surrounded by organic tea gardens, private valley balconies, heated infinity waters, and mountain wellness rituals.",
    experienceEyebrow: "THE ART OF HIGHLAND LIVING",
    experienceTitle: "Your time, amidst tea leaves and drifting clouds.",
    experienceDescription:
      "Breathe the crisp Nilgiri air, stroll through private tea plantations, savor farm-to-table Kerala gastronomy, and unwind beside our hill-facing heated pool.",
    contactEmail: "concierge@viceroyresort.com",
    contactPhone: "+91 4865 230 000",
    contactAddress: "Viceroy Sanctuary, Tea Valley Road, Pothamedu, Munnar, Kerala 685612, India",
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    suite: "",
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

  // Fetch dynamic content, reviews, and rooms from MongoDB
  useEffect(() => {
    fetchResortContentApi()
      .then((data) => {
        if (data?.content) {
          setContent(data.content);
        }
      })
      .catch((err) => console.warn("Using default resort content:", err.message));

    fetchPublishedReviews()
      .then((data) => {
        if (data?.reviews) setReviews(data.reviews);
      })
      .catch((err) => console.warn("Could not load reviews:", err.message));

    fetchRooms()
      .then((data) => {
        if (data?.rooms && data.rooms.length > 0) {
          setRoomsList(data.rooms);
          setForm((prev) => ({
            ...prev,
            suite: prev.suite || data.rooms[0].name,
          }));
        }
      })
      .catch((err) => console.warn("Could not load luxury suites:", err.message));
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
        suite: roomsList[0]?.name || "",
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
          Viceroy<span>.</span> <span style={{ fontSize: "16px", color: "#c49d68", fontWeight: "normal", letterSpacing: "1px" }}>Munnar</span>
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
          <a href="#estate" onClick={() => setMenuOpen(false)}>The Estate</a>
          <a href="#rooms" onClick={() => setMenuOpen(false)}>Suites</a>
          <a href="#climate" onClick={() => setMenuOpen(false)}>Climate</a>
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
        <section
          className="hero"
          id="home"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(20, 34, 23, 0.88), rgba(20, 34, 23, 0.45)), linear-gradient(0deg, rgba(20, 34, 23, 0.6), transparent), url('${resolveImgUrl(content.heroBannerImage || "/images/frontview.png")}')`,
            backgroundPosition: "center 50%",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="hero-content">
            <span className="eyebrow light">
              {content.heroEyebrow || "🌿 MIST-CLAD HIGHLAND RETREAT · MUNNAR, KERALA (5,200 FT)"}
            </span>
            <h1>{content.heroTitle || "Where the Clouds Embrace the Tea Hills"}</h1>
            <p>
              {content.heroDescription ||
                "Perched 5,200 feet above sea level amidst Munnar's undulating tea estates, Viceroy Resort blends colonial architectural elegance with panoramic misty valleys, tea estate walkways, private balconies, and restorative mountain tranquility."}
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

        {/* Munnar Highland Highlights Strip */}
        <section className="highland-strip">
          <div className="highland-strip-grid">
            <div className="highland-item">
              <span className="highland-icon">🏔️</span>
              <div>
                <h4>5,200 Ft Elevation</h4>
                <p>Crisp mountain air, perpetual valley mist & year-round cool climate in the Western Ghats.</p>
              </div>
            </div>

            <div className="highland-item">
              <span className="highland-icon">🍃</span>
              <div>
                <h4>Endless Tea Terraces</h4>
                <p>Bordering historic organic tea plantations with private morning walks and harvesting trails.</p>
              </div>
            </div>

            <div className="highland-item">
              <span className="highland-icon">🏊</span>
              <div>
                <h4>Heated Mountain Pool</h4>
                <p>Temperature-controlled infinity pool deck overlooking the emerald mountain ridge.</p>
              </div>
            </div>

            <div className="highland-item">
              <span className="highland-icon">☕</span>
              <div>
                <h4>Artisanal Tea Sommelier</h4>
                <p>Daily private tastings of single-estate Munnar leaf harvests and bespoke herbal infusions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* About section */}
        <section className="about section" id="about">
          <div className="section-header" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto 30px" }}>
            <span className="eyebrow">{content.aboutEyebrow || "HIGH-ALTITUDE SERENITY"}</span>
            <h2>{content.aboutTitle || "Crafted for peaceful reflection, immersed in Munnar's tea hills."}</h2>
          </div>

          <div className="about-split-grid">
            <div>
              <p style={{ fontSize: "16px", lineHeight: "1.8", color: "#4f5c52", margin: "0 0 16px" }}>
                {content.aboutDescription ||
                  "Viceroy Resort Munnar harmonizes contemporary luxury with the natural contour of the Western Ghats—surrounded by organic tea gardens, private valley balconies, heated infinity waters, and mountain wellness rituals."}
              </p>
              <p style={{ fontSize: "14.5px", lineHeight: "1.7", color: "#6a7b70", margin: "0 0 20px" }}>
                Wake up to the soft rustle of tea leaves, watch the morning clouds roll through your private balcony, and surrender to the soothing rhythm of slow highland living. Every residence is meticulously positioned to capture breathtaking sunrise vistas over the Pothamedu peaks.
              </p>

              <div className="about-features-list">
                <div className="about-feature-item">
                  <span>✓</span> Over 40 acres of private tea plantation slopes and spice trails
                </div>
                <div className="about-feature-item">
                  <span>✓</span> Heated mountain infinity pool overlooking mist-filled valleys
                </div>
                <div className="about-feature-item">
                  <span>✓</span> Private view balconies for every suite, residence, and cottage
                </div>
                <div className="about-feature-item">
                  <span>✓</span> Hillside dining with authentic Malabar spice gastronomy
                </div>
              </div>

              <div style={{ marginTop: "28px" }}>
                <a href="#estate" className="outline-button" style={{ display: "inline-block" }}>
                  Explore The Munnar Estate Grounds →
                </a>
              </div>
            </div>

            <div className="about-image-frame">
              <img
                src="/images/garden.png"
                alt="Botanical Tea Gardens & Grounds at Viceroy Munnar"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/frontview.png";
                }}
              />
              <div className="about-image-tag">
                <strong>Botanical Grounds & Tea Trails</strong> · Viceroy Resort Munnar
              </div>
            </div>
          </div>
        </section>

        {/* The Estate & Grounds Showcase (The 5 Munnar Images) */}
        <section className="estate-gallery" id="estate">
          <div className="section-header" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
            <span className="eyebrow">THE ESTATE AT A GLANCE</span>
            <h2>Glimpses of Viceroy Sanctuary, Munnar</h2>
            <div className="ornament" style={{ margin: "16px auto" }} />
            <p className="section-description">
              From misty dawn balconies to fireside dining and heated infinity waters, explore the tranquil highland spaces crafted for restorative seclusion.
            </p>
          </div>

          <div className="gallery-grid-munnar">
            {/* Card 1: Front View (col-8) */}
            <article className="gallery-item col-8">
              <img src="/images/frontview.png" alt="Viceroy Resort Munnar Grand Front Facade" loading="lazy" />
              <div className="gallery-overlay-card">
                <span className="gallery-badge">Highland Estate Architecture</span>
                <h3>The Grand Highland Facade</h3>
                <p>Iconic colonial-contemporary facade nestled amidst lush mountain terraces and misty Munnar tea hills.</p>
              </div>
            </article>

            {/* Card 2: Pool Area (col-4) */}
            <article className="gallery-item col-4">
              <img src="/images/poolarea.png" alt="Heated Mountain Infinity Pool" loading="lazy" />
              <div className="gallery-overlay-card">
                <span className="gallery-badge">Mountain Wellness</span>
                <h3>Horizon Infinity Pool</h3>
                <p>Temperature-controlled waters offering sweeping panoramic views of Munnar's rolling green valleys.</p>
              </div>
            </article>

            {/* Card 3: Balcony (col-4-bottom) */}
            <article className="gallery-item col-4-bottom">
              <img src="/images/balcony.png" alt="Private Tea-Valley Balcony" loading="lazy" />
              <div className="gallery-overlay-card">
                <span className="gallery-badge">Private Sanctuaries</span>
                <h3>Private Misty Balconies</h3>
                <p>Step into morning cloud cover with your personal hot brew over cascading tea terraces.</p>
              </div>
            </article>

            {/* Card 4: Dinning Area (col-4-bottom) */}
            <article className="gallery-item col-4-bottom">
              <img src="/images/dinningarea.png" alt="Hillside Estate Dining Restaurant" loading="lazy" />
              <div className="gallery-overlay-card">
                <span className="gallery-badge">Gourmet Dining</span>
                <h3>Hillside Estate Dining</h3>
                <p>Panoramic glass-walled dining celebrating authentic Malabar spices, organic mountain produce & fine wine.</p>
              </div>
            </article>

            {/* Card 5: Garden (col-4-bottom) */}
            <article className="gallery-item col-4-bottom">
              <img src="/images/garden.png" alt="Lush Tea Gardens & Promenades" loading="lazy" />
              <div className="gallery-overlay-card">
                <span className="gallery-badge">Lush Grounds</span>
                <h3>Botanical Spice & Tea Garden</h3>
                <p>Secluded private walking promenades lined with cardamom, wild orchids, and pristine tea shrubs.</p>
              </div>
            </article>
          </div>
        </section>

        {/* Accommodations & Residences */}
        <section className="accommodations section" id="rooms">
          <div className="section-heading">
            <span className="eyebrow">RESIDENCES & SANCTUARIES</span>
            <h2>Private mountain living, curated for restorative ease.</h2>
            <div className="ornament" />
            <p className="section-description">
              Each residence at Viceroy Munnar is an architectural tribute to the highland elements—featuring panoramic tea-valley vistas, private mist-facing balconies, deep soaking baths, and bespoke concierge care.
            </p>
          </div>

          {roomsList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#8a7c6a" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: "16px" }}>Discovering available luxury suites...</p>
            </div>
          ) : (
            <div className="room-grid">
              {roomsList.map((room, index) => {
                const imageSrc =
                  room.image
                    ? resolveImgUrl(room.image)
                    : index % 3 === 0
                    ? "/images/balcony.png"
                    : index % 3 === 1
                    ? "/images/frontview.png"
                    : "/images/poolarea.png";

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
                        e.currentTarget.src = "/images/balcony.png";
                      }}
                    />

                    <div className="room-overlay">
                      <div>
                        <span className="eyebrow light">
                          {room.category || "HIGHLAND SUITE"}
                        </span>
                        <h3>{room.name}</h3>
                        <div style={{ fontSize: "12px", color: "#c49d68", margin: "4px 0", letterSpacing: "0.5px" }}>
                          📍 {room.location || "Munnar Tea Valley"} · 🚪 {room.totalRooms || 4} Rooms Suite
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
          )}

          {currentUser?.role !== "admin" && (
            <a href="/booking" className="outline-button">
              Explore All Accommodations & Book →
            </a>
          )}
        </section>

        {/* Munnar Seasonal Guide */}
        <section className="seasons-section" id="climate">
          <div className="section-header" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
            <span className="eyebrow">CLIMATE & SEASONS IN MUNNAR</span>
            <h2>A Year-Round Mountain Sanctuary</h2>
            <div className="ornament" style={{ margin: "16px auto" }} />
            <p className="section-description">
              Perched at 5,200 ft, Munnar enjoys a perpetual cool mountain climate. Each season brings its own distinctive charm to the Viceroy estate.
            </p>
          </div>

          <div className="seasons-grid">
            <div className="season-card">
              <div>
                <div className="season-header">
                  <span className="season-icon">🌧️</span>
                  <span className="season-temp-tag">14°C – 19°C</span>
                </div>
                <h3>Misty Monsoon (June – Sept)</h3>
                <p>
                  Experience the magical monsoon mist of the Western Ghats. Cascading streams, dramatic fog sweeping through the tea hills, and the earthy aroma of fresh rain on cardamom leaves.
                </p>
              </div>
              <div className="season-highlight">
                ☕ Best for: Cozy fireside tea rituals & misty balcony contemplation
              </div>
            </div>

            <div className="season-card">
              <div>
                <div className="season-header">
                  <span className="season-icon">❄️</span>
                  <span className="season-temp-tag">9°C – 16°C</span>
                </div>
                <h3>Crisp Winter & Autumn (Oct – Feb)</h3>
                <p>
                  Clear blue skies and crisp, invigorating mountain chill. Morning ground frost on tea leaves, brilliant stargazing under cloudless skies, and outdoor evening campfires.
                </p>
              </div>
              <div className="season-highlight">
                🔥 Best for: High-altitude trekking, romantic getaways & campfire dinners
              </div>
            </div>

            <div className="season-card">
              <div>
                <div className="season-header">
                  <span className="season-icon">🌸</span>
                  <span className="season-temp-tag">16°C – 23°C</span>
                </div>
                <h3>Highland Spring (March – May)</h3>
                <p>
                  A refreshing haven from the summer heat of the plains. Mild pleasant sunshine, vibrant wildflower blooms, and the primary season for artisanal tea plucking.
                </p>
              </div>
              <div className="season-highlight">
                🍃 Best for: Family retreats, nature photography & tea estate excursions
              </div>
            </div>
          </div>
        </section>

        {/* Experience banner */}
        <section
          className="experience section"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(20, 34, 23, 0.85), rgba(20, 34, 23, 0.3)), url('/images/poolarea.png')`,
            backgroundPosition: "center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="experience-content">
            <span className="eyebrow light">{content.experienceEyebrow || "THE ART OF HIGHLAND LIVING"}</span>
            <h2>{content.experienceTitle || "Your time, amidst tea leaves and drifting clouds."}</h2>
            <p>
              {content.experienceDescription ||
                "Breathe the crisp Nilgiri air, stroll through private tea plantations, savor farm-to-table Kerala gastronomy, and unwind beside our hill-facing heated pool."}
            </p>
            <a href="#contact" className="primary-button">
              Plan Your Munnar Stay →
            </a>
          </div>
        </section>

        {/* Reviews and Ratings Module */}
        <section className="reviews section" id="reviews" style={{ padding: "60px 24px", maxWidth: "1200px", margin: "0 auto" }}>
          <div className="section-header" style={{ textAlign: "center", marginBottom: "40px" }}>
            <span className="eyebrow">GUEST EXPERIENCES & REVIEWS</span>
            <h2>Timeless memories shared by our distinguished guests.</h2>
          </div>

          {reviews.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              {reviews.map((rev) => (
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
                    {"★".repeat(rev.rating || 5)}
                  </div>
                  <h4 style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#142217", margin: "0 0 6px" }}>
                    "{rev.title || "Exceptional Sanctuary"}"
                  </h4>
                  <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#4f5c52", margin: "0 0 16px" }}>
                    {rev.comment}
                  </p>
                  <div style={{ borderTop: "1px solid #f0ebe2", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#8a7c6a" }}>
                    <strong>{rev.userName || rev.user?.fullName || "Guest"}</strong>
                    <span>{rev.suiteName || "Viceroy Residence"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "40px 24px",
                background: "#ffffff",
                border: "1px dashed #dcd3c5",
                borderRadius: "8px",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <p style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#142217", marginBottom: "8px" }}>
                Be Among the First to Share Your Experience
              </p>
              <p style={{ fontSize: "14px", color: "#6a7b70", lineHeight: "1.5" }}>
                Verified guest reviews and testimonials are published here following exceptional stays at Viceroy Sanctuary.
              </p>
            </div>
          )}
        </section>

        {/* Contact / Concierge Inquiry form */}
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
                <p>{content.contactEmail || "concierge@viceroyresort.com"}</p>
              </div>

              <div className="contact-detail">
                <span>PHONE</span>
                <p>{content.contactPhone || "+91 4865 230 000"}</p>
              </div>

              <div className="contact-detail">
                <span>SANCTUARY LOCATION</span>
                <p>{ "Viceroy Sanctuary, Tea Valley Road, Pothamedu, Munnar, Kerala 685612, India"}</p>
              </div>

              <div className="contact-detail">
                <span>GETTING HERE</span>
                <p>110 km from Cochin Int'l Airport (COK). Luxury private chauffeur transfers arranged upon request.</p>
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
                      <option key={room._id || room.name} value={room.name}>
                        {room.name}
                      </option>
                    ))}
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
          Viceroy<span>.</span> <span style={{ fontSize: "16px", color: "#c49d68", fontWeight: "normal" }}>Munnar</span>
        </a>

        <p>A Mist-Clad Highland Sanctuary in Munnar, Kerala. Exceptional stays, timeless memories.</p>

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
