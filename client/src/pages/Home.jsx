
import React, { useState } from "react";
import "../styles/Home.css";

const rooms = [
  {
    name: "Travertine Ocean Horizon Pavilion",
    category: "SANCTUARY SUITE MASTER QUARTERS",
    tag: "PANORAMIC OCEANFRONT",
    image: "/images/viceroy-bedroom.jpg",
  },
  {
    name: "Private Garden Sanctuary",
    category: "PRIVATE WELLNESS RETREAT",
    tag: "GARDEN VIEWS",
    image: "/images/viceroy-bath.jpg",
  },
  {
    name: "Architectural Coastal Residence",
    category: "PRIVATE RESIDENCE",
    tag: "EXCLUSIVE LIVING",
    image: "/images/viceroy-villa.jpg",
  },
];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    suite: rooms[0].name,
    message: "",
  });

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    alert("Thank you! Your inquiry has been prepared.");
  }

  return (
    <div className="viceroy">
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
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>

        <a className="login-button" href="/login">
          Login
        </a>
      </header>

      <main>
        {/* Hero */}
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow light">
              ✦ &nbsp; A PRIVATE COASTAL SANCTUARY
            </span>

            <h1>Viceroy</h1>

            <p>
              A secluded coastal enclave designed for contemplation,
              quiet luxury, and timeless repose. Framed by
              travertine arches and tranquil ocean tides.
            </p>

            <a href="#accommodations" className="primary-button">
              Discover Your Sanctuary &nbsp; →
            </a>
          </div>
        </section>

        {/* Resort philosophy */}
        <section className="ethos section" id="about">
          <span className="eyebrow">THE VICEROY ETHOS</span>

          <h2>
            Architecture conceived as an instrument of peace.
          </h2>

          <div className="ornament" />

          <p className="section-description">
            Nestled at the edge of the Pacific tides, Viceroy Resort
            blends natural stone, warm cedar, and thoughtful
            architecture to create an extraordinary retreat.
          </p>

          <p className="secondary-description">
            Discover private wellness experiences, tranquil
            surroundings, and intuitive hospitality designed
            around your comfort.
          </p>
        </section>

        {/* Featured accommodation */}
        <section
          className="accommodations section"
          id="accommodations"
        >
          <div className="section-heading">
            <span className="eyebrow">
              ACCOMMODATIONS & RESIDENCES
            </span>

            <h2>Architectural Sanctuaries of Viceroy</h2>

            <div className="ornament" />

            <p className="section-description">
              Private retreats with peaceful views, elegant interiors,
              and space to unwind.
            </p>
          </div>

          <div className="room-grid">
            {rooms.map((room, index) => (
              <article
                className={`room-card room-card-${index + 1}`}
                key={room.name}
              >
                <img src={room.image} alt={room.name} />

                <div className="room-overlay">
                  <div>
                    <span className="eyebrow light">
                      {room.category}
                    </span>
                    <h3>{room.name}</h3>
                  </div>

                  <span className="room-tag">{room.tag}</span>
                </div>
              </article>
            ))}
          </div>

          <a href="/rooms" className="outline-button">
            Explore All Accommodations →
          </a>
        </section>

        {/* Experiences */}
        <section className="experience section">
          <div className="experience-content">
            <span className="eyebrow light">
              THE ART OF SLOW LIVING
            </span>

            <h2>Your time, beautifully uninterrupted.</h2>

            <p>
              Reconnect with nature through private wellness
              experiences, restorative spaces, and personalized
              resort hospitality.
            </p>

            <a href="#contact" className="primary-button">
              Plan Your Stay →
            </a>
          </div>
        </section>

        {/* Contact form */}
        <section className="contact section" id="contact">
          <div className="contact-intro">
            <span className="eyebrow">PERSONALIZED HOSPITALITY</span>
            <h2>Contact</h2>

            <p>
              Whether you are planning a private escape or need
              assistance arranging your stay, our concierge team
              is ready to help.
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

            <div className="form-grid">
              <label>
                FIRST NAME
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Your first name"
                  required
                />
              </label>

              <label>
                LAST NAME
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Your last name"
                  required
                />
              </label>

              <label>
                EMAIL ADDRESS
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
                  {rooms.map((room) => (
                    <option key={room.name} value={room.name}>
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
                  placeholder="Tell us about your ideal stay..."
                  rows="5"
                />
              </label>
            </div>

            <button type="submit" className="submit-button">
              Send Your Inquiry →
            </button>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <a className="brand" href="#home">
          Viceroy<span>.</span>
        </a>

        <p>Exceptional stays. Timeless memories.</p>

        <div>
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>

        <small>© {new Date().getFullYear()} Viceroy Resort.</small>
      </footer>
    </div>
  );
}

export default Home;
