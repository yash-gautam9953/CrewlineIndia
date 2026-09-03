import AnimatedSection from "@/components/AnimatedSection";
import Image from "next/image";

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <header className="hero">
        <div className="container hero-container">
          <AnimatedSection animation="fade-up" className="hero-content">
            <div className="hero-badge">Based in Greater Noida | Expanding Pan-India</div>
            <h1>Event & Volunteer <span className="highlight">Staffing Solutions</span></h1>
            <p>Reliable event manpower, sourced and managed end-to-end. Say goodbye to last-minute scrambling and no-shows.</p>
            <div className="hero-actions">
              <a href="#contact" className="btn btn-primary btn-large">Hire Staff Now</a>
              <a href="#services" className="btn btn-secondary btn-large">Explore Services</a>
            </div>
          </AnimatedSection>
          
          <AnimatedSection animation="fade-left" className="hero-image" delay={200}>
            <div className="mascot-wrapper">
              <Image 
                src="/beaver.jpg" 
                alt="Crewline Beaver Mascot" 
                width={400} 
                height={400} 
                className="mascot-image"
                priority
              />
            </div>
          </AnimatedSection>
        </div>
        <div className="curve-bottom">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,42.7C1120,32,1280,32,1360,32L1440,32L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" fill="#FFFFFF"></path>
          </svg>
        </div>
      </header>

      {/* Problem & Why Us Section */}
      <section id="problem" className="section">
        <div className="container">
          <div className="two-col-layout">
            <AnimatedSection animation="fade-right" className="problem-box card">
              <h2>The Problem</h2>
              <ul className="problem-list">
                <li>
                  <div className="icon-circle text-red"><i className="fa-regular fa-clock"></i></div>
                  <p>Event organizers struggle to find reliable, well-briefed staff on short notice.</p>
                </li>
                <li>
                  <div className="icon-circle text-red"><i className="fa-solid fa-user-xmark"></i></div>
                  <p>No-shows and unprofessional volunteers hurt the event experience.</p>
                </li>
                <li>
                  <div className="icon-circle text-red"><i className="fa-solid fa-face-frown"></i></div>
                  <p>Last-minute scrambling reflects poorly on organizers.</p>
                </li>
              </ul>
            </AnimatedSection>
            
            <AnimatedSection animation="fade-left" className="solution-box">
              <div className="section-header align-left">
                <h2>Why Crewline India <span className="highlight">✨</span></h2>
                <p>We solve the chaos of event staffing with a structured, reliable approach.</p>
              </div>
              
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-shield-check"></i></div>
                  <h3>Reliability</h3>
                  <p>Pre-vetted volunteer pool with a 10–15% standby buffer. No last-minute gaps.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-user-tie"></i></div>
                  <h3>Professionalism</h3>
                  <p>Uniformed/branded staff, on-site supervisors, and post-event feedback reports.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-bolt"></i></div>
                  <h3>Speed</h3>
                  <p>Able to scale staffing on short notice for exhibitions and large events.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon"><i className="fa-solid fa-map-location-dot"></i></div>
                  <h3>Reach</h3>
                  <p>Currently NCR-based, expanding pan-India as our business grows.</p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section id="services" className="section bg-light-green">
        <div className="container">
          <AnimatedSection animation="fade-up" className="section-header text-center">
            <h2>What We Do</h2>
            <p>Comprehensive staffing roles covered for any event size</p>
          </AnimatedSection>
          
          <div className="services-grid">
            <AnimatedSection animation="zoom-in" delay={100} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-id-badge"></i></div>
              <h3>Registration & Badge Scanning</h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={200} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-arrows-down-to-people"></i></div>
              <h3>Ushers & Crowd Management</h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={300} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-handshake-angle"></i></div>
              <h3>Hospitality & Guest Relations</h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={400} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-shop"></i></div>
              <h3>Exhibitor / Stall Assistance</h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={100} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-headset"></i></div>
              <h3>Technical & AV Support</h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={200} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-language"></i></div>
              <h3>Multilingual / Interpreter Staff</h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={300} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-clipboard-user"></i></div>
              <h3>On-site Supervisors <br/><small>(1 per 10-15 staff)</small></h3>
            </AnimatedSection>
            <AnimatedSection animation="zoom-in" delay={400} className="service-card">
              <div className="service-icon"><i className="fa-solid fa-rotate"></i></div>
              <h3>Backup Staff <br/><small>on standby</small></h3>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Who We Serve Section */}
      <section id="serve" className="section">
        <div className="container">
          <AnimatedSection animation="fade-up" className="section-header text-center">
            <h2>Who We Serve</h2>
          </AnimatedSection>
          <div className="serve-grid">
            <AnimatedSection animation="fade-up" delay={100} className="serve-item">
              <i className="fa-solid fa-building-user"></i>
              <span>Trade Shows & Exhibitions</span>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={200} className="serve-item">
              <i className="fa-solid fa-chalkboard-user"></i>
              <span>Corporate Conferences</span>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={300} className="serve-item">
              <i className="fa-solid fa-guitar"></i>
              <span>Concerts & Public Events</span>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={400} className="serve-item">
              <i className="fa-solid fa-school"></i>
              <span>College Fests</span>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={500} className="serve-item">
              <i className="fa-solid fa-ring"></i>
              <span>Weddings & Social Events</span>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={600} className="serve-item">
              <i className="fa-solid fa-hand-holding-heart"></i>
              <span>NGO & Govt Programs</span>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="process" className="section bg-dark">
        <div className="container">
          <AnimatedSection animation="fade-up" className="section-header text-center light-text">
            <h2>How It Works</h2>
            <p>Seamless execution from request to report</p>
          </AnimatedSection>
          <div className="timeline">
            <AnimatedSection animation="fade-up" delay={100} className="timeline-item">
              <div className="step-num">1</div>
              <div className="timeline-content">
                <div className="step-icon"><i className="fa-solid fa-file-signature"></i></div>
                <h3>Client shares event requirements</h3>
                <p>We understand your event needs, roles & expectations.</p>
              </div>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={200} className="timeline-item">
              <div className="step-num">2</div>
              <div className="timeline-content">
                <div className="step-icon"><i className="fa-solid fa-magnifying-glass-chart"></i></div>
                <h3>Crewline shortlists & briefs</h3>
                <p>We select the right people and brief them thoroughly.</p>
              </div>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={300} className="timeline-item">
              <div className="step-num">3</div>
              <div className="timeline-content">
                <div className="step-icon"><i className="fa-solid fa-people-group"></i></div>
                <h3>On-ground deployment</h3>
                <p>Our team is deployed with on-site supervisors to ensure seamless execution.</p>
              </div>
            </AnimatedSection>
            <AnimatedSection animation="fade-up" delay={400} className="timeline-item">
              <div className="step-num">4</div>
              <div className="timeline-content">
                <div className="step-icon"><i className="fa-solid fa-file-contract"></i></div>
                <h3>Post-event report & feedback</h3>
                <p>We share a detailed report and gather feedback to improve every time.</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Coverage and Momentum */}
      <section className="section">
        <div className="container">
          <AnimatedSection animation="zoom-in" className="stats-banner">
            <div className="stat-banner-item">
              <i className="fa-solid fa-map-pin"></i>
              <h4>Delhi NCR</h4>
              <p>Current primary operating region</p>
            </div>
            <div className="stat-banner-item">
              <i className="fa-solid fa-graduation-cap"></i>
              <h4>4 Universities</h4>
              <p>Active pipeline (Sharda, Galgotias, Amity, GL Bajaj)</p>
            </div>
            <div className="stat-banner-item">
              <i className="fa-solid fa-handshake-angle"></i>
              <h4>India Expo Mart</h4>
              <p>Actively engaging for upcoming shows</p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  );
}
