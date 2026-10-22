import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">
      <a href="/" className="navbar-logo">
        VICEROY
      </a>

      <nav className="navbar-links">
        <a href="/" className="active">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </nav>

      <a href="/login" className="login-button">
        Login
      </a>
    </header>
  );
}

export default Navbar;