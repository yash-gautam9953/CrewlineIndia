import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Image from "next/image";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CrewLine India - Event & Volunteer Staffing Solutions",
  description: "Reliable event manpower, sourced and managed end-to-end. Based in Greater Noida, expanding Pan-India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <Navbar />
        {children}
        <footer id="contact" className="footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-brand">
                <a href="#" className="logo text-white">
                  <span className="logo-icon">
                    <Image src="/beaver.jpg" alt="CrewLine" width={60} height={60} className="logo-img" />
                  </span>
                  <div className="logo-text">
                    <span className="logo-crew text-white">Crew</span>
                    <div className="logo-line-wrapper">
                      <span className="logo-line text-white">Line</span>
                      <span className="logo-sub">-INDIA-</span>
                    </div>
                  </div>
                </a>
                <p>Ready to support your next trade show, conference, or concert. Let's discuss your staffing needs.</p>
              </div>
              
              <div className="contact-card">
                <h3>Let's Talk</h3>
                <a href="https://wa.me/918851648790" target="_blank" className="contact-link" rel="noreferrer">
                  <div className="contact-icon"><i className="fa-brands fa-whatsapp"></i></div>
                  <div>
                    <span className="label">Phone / WhatsApp</span>
                    <span className="value">+91 8851648790</span>
                  </div>
                </a>
                <a href="mailto:crewlineindia@gmail.com" className="contact-link">
                  <div className="contact-icon"><i className="fa-regular fa-envelope"></i></div>
                  <div>
                    <span className="label">Email</span>
                    <span className="value">crewlineindia@gmail.com</span>
                  </div>
                </a>
                <a href="https://instagram.com/crewline.india" target="_blank" className="contact-link" rel="noreferrer">
                  <div className="contact-icon"><i className="fa-brands fa-instagram"></i></div>
                  <div>
                    <span className="label">Instagram</span>
                    <span className="value">@crewline.india</span>
                  </div>
                </a>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} CrewLine India. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
