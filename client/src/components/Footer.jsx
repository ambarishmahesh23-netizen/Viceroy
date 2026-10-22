import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h2>VICEROY</h2>
          <p>A sanctuary of timeless luxury and tranquility.</p>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Viceroy Resort.
            All rights reserved.
          </p>

          <div className="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Residency</a>
            <a href="/contact">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;