"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-container">
          <a href="#" className="logo">
            <span className="logo-icon">
              <Image src="/beaver.png" alt="CrewLine" width={60} height={60} className="logo-img" />
            </span>
            <div className="logo-text">
              <span className="logo-crew">Crew</span>
              <div className="logo-line-wrapper">
                <span className="logo-line">Line</span>
                <span className="logo-sub">-INDIA-</span>
              </div>
            </div>
          </a>
          <div className="nav-links">
            <a href="#problem">Why Us</a>
            <a href="#services">Services</a>
            <a href="#process">How It Works</a>
            <a href="#contact" className="btn btn-primary">Let&apos;s Talk</a>
          </div>
          <button className="mobile-menu-btn" onClick={toggleMenu}>
            <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>
        </div>
      </nav>

      <div className={`mobile-nav ${menuOpen ? "active" : ""}`}>
        <a href="#problem" onClick={closeMenu}>Why Us</a>
        <a href="#services" onClick={closeMenu}>Services</a>
        <a href="#process" onClick={closeMenu}>How It Works</a>
        <a href="#contact" className="btn btn-primary" onClick={closeMenu}>Let&apos;s Talk</a>
      </div>
    </>
  );
}
