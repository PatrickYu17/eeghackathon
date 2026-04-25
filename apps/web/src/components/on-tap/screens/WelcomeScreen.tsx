"use client";

import Image from "next/image";
import { useState } from "react";

export function WelcomeScreen({
  barName,
  onStaffLogin,
  onManagerLogin,
  onGetStarted,
  onChangeBar,
}: {
  barName?: string;
  onStaffLogin: () => void;
  onManagerLogin: () => void;
  onGetStarted: () => void;
  onChangeBar: () => void;
}) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div style={styles.root}>
      {/* Wave texture at bottom */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      {/* Page content */}
      <div style={styles.content}>
        {/* Logo */}
        <div style={{ ...styles.logoWrap, animation: "bounceIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
          <Image src="/logo.png" alt="OnTap logo" width={80} height={80} style={styles.logoImg} priority />
        </div>

        {/* Heading */}
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>{barName || "welcome to OnTap"}</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.18s both" }}>who&apos;s logging in tonight?</p>

        {/* Login cards */}
        <div style={styles.cards}>
          <button
            className="card-animate"
            style={{
              ...styles.card,
              animation: "fadeInScale 0.5s cubic-bezier(0.25, 1, 0.5, 1) 0.25s both",
              ...(hoveredCard === "staff" ? styles.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard("staff")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={onStaffLogin}
          >
            <div style={{ ...styles.iconCircle, transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)", transform: hoveredCard === "staff" ? "scale(1.1)" : "scale(1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div style={styles.cardText}>
              <span style={styles.cardTitle}>staff login</span>
              <span style={styles.cardSub}>enter name</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s ease", transform: hoveredCard === "staff" ? "translateX(3px)" : "translateX(0)" }}><path d="M9 18l6-6-6-6"/></svg>
          </button>

          <button
            className="card-animate"
            style={{
              ...styles.card,
              animation: "fadeInScale 0.5s cubic-bezier(0.25, 1, 0.5, 1) 0.32s both",
              ...(hoveredCard === "manager" ? styles.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard("manager")}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={onManagerLogin}
          >
            <div style={{ ...styles.iconCircle, transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)", transform: hoveredCard === "manager" ? "scale(1.1)" : "scale(1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style={styles.cardText}>
              <span style={styles.cardTitle}>manager login</span>
              <span style={styles.cardSub}>enter code</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s ease", transform: hoveredCard === "manager" ? "translateX(3px)" : "translateX(0)" }}><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <p style={{ ...styles.footer, animation: "fadeIn 0.5s ease 0.45s both" }}>
          {barName ? "not your bar?" : "new bar?"}{" "}
          <span style={styles.footerLink} onClick={barName ? onChangeBar : onGetStarted}>{barName ? "switch bar" : "get started"}</span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0d1f3c",
  },
  waveContainer: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
  },
  waveSvg: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  content: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "400px",
    padding: "0 32px",
  },
  logoWrap: {
    marginBottom: "20px",
  },
  logoImg: {
    width: "80px",
    height: "80px",
    objectFit: "contain",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.08)",
    padding: "4px",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "28px",
    fontWeight: "600",
    color: "#ffffff",
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
    textAlign: "center",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#a8b8cc",
    margin: "0 0 36px",
    fontWeight: "400",
    textAlign: "center",
  },
  cards: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "28px",
  },
  card: {
    width: "100%",
    background: "#ffffff",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    textAlign: "left",
  },
  cardHover: {
    borderColor: "#ffffff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
  },
  iconCircle: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  cardTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0d1f3c",
    letterSpacing: "-0.01em",
  },
  cardSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "400",
  },
  footer: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#ffffff",
    margin: 0,
  },
  footerLink: {
    color: "#ffffff",
    fontWeight: "600",
    textDecoration: "underline",
    cursor: "pointer",
  },
};
