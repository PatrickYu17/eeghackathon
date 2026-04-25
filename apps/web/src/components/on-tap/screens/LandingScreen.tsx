"use client";

import Image from "next/image";
import { useState } from "react";

export function LandingScreen({
  onGetStarted,
  onHaveAccount,
}: {
  onGetStarted: () => void;
  onHaveAccount: () => void;
}) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div style={styles.root}>
      {/* Wave texture at bottom */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Logo */}
        <div style={{ ...styles.logoWrap, animation: "bounceIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
          <Image src="/logo.png" alt="OnTap logo" width={80} height={80} style={styles.logoImg} priority />
        </div>

        {/* Heading */}
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>Welcome to OnTap</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.25s both" }}>Smart inventory for bars that move fast</p>

        {/* Buttons */}
        <div style={{ ...styles.buttons, animation: "fadeInUp 0.6s cubic-bezier(0.25, 1, 0.5, 1) 0.35s both" }}>
          <button
            className="btn-animate"
            style={{
              ...styles.btnPrimary,
              ...(hoveredBtn === "start" ? styles.btnPrimaryHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn("start")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={onGetStarted}
          >
            Get Started
          </button>

          <button
            className="btn-animate"
            style={{
              ...styles.btnSecondary,
              ...(hoveredBtn === "account" ? styles.btnSecondaryHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn("account")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={onHaveAccount}
          >
            I Have an Account
          </button>
        </div>
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
    marginBottom: "24px",
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
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
    textAlign: "center",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#a8b8cc",
    margin: "0 0 40px",
    fontWeight: "400",
    textAlign: "center",
    lineHeight: "1.5",
  },
  buttons: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  btnPrimary: {
    width: "100%",
    padding: "16px",
    background: "#ffffff",
    color: "#0d1f3c",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
    transition: "opacity 0.15s ease, transform 0.15s ease",
    boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
  },
  btnPrimaryHover: {
    opacity: 0.92,
    transform: "translateY(-1px)",
  },
  btnSecondary: {
    width: "100%",
    padding: "16px",
    background: "transparent",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "400",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
    transition: "border-color 0.15s ease",
  },
  btnSecondaryHover: {
    borderColor: "rgba(255,255,255,0.7)",
  },
};
