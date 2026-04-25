import { useState } from "react";

const Settings = ({ barName = "The Anchor Bar", onChangeStaff, onChangeLiquor, onChangeFullStock, onLogOut, onBack }) => {
  const [hoveredItem, setHoveredItem] = useState(null);

  const items = [
    {
      id: "staff",
      label: "Change Staff",
      onClick: onChangeStaff,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      id: "liquor",
      label: "Change Liquor",
      onClick: onChangeLiquor,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 3H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l4.58-4.58c.94-.94.94-2.48 0-3.42L8 3z"/>
          <circle cx="6" cy="6" r="1" fill="#0d1f3c" stroke="none"/>
        </svg>
      ),
    },
    {
      id: "stock",
      label: "Change Default Full Stock",
      onClick: onChangeFullStock,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
    },
  ];

  return (
    <div style={styles.root}>
      {/* Wave */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      {/* Card */}
      <div style={styles.card}>

        {/* Back */}
        <button style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span style={styles.backText}>back</span>
        </button>

        {/* Header */}
        <h1 style={styles.heading}>Settings</h1>
        <p style={styles.subheading}>{barName}</p>

        {/* Options list */}
        <div style={styles.list}>
          {items.map((item, i) => (
            <button
              key={item.id}
              style={{
                ...styles.listItem,
                borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none",
                background: hoveredItem === item.id ? "#f9fafb" : "#ffffff",
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={item.onClick}
            >
              <span style={styles.itemIcon}>{item.icon}</span>
              <span style={styles.itemLabel}>{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          ))}

          {/* Log out */}
          <button
            style={{
              ...styles.listItem,
              borderTop: "1px solid #f3f4f6",
              background: hoveredItem === "logout" ? "#fff5f5" : "#ffffff",
            }}
            onMouseEnter={() => setHoveredItem("logout")}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={onLogOut}
          >
            <span style={styles.itemIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            <span style={{ ...styles.itemLabel, color: "#ef4444" }}>Log Out</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

      </div>
    </div>
  );
};

const styles = {
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
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  },
  waveSvg: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "#ffffff",
    borderRadius: "20px",
    padding: "32px 36px",
    width: "100%",
    maxWidth: "480px",
    margin: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0 0 20px",
  },
  backText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "26px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 28px",
  },
  list: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },
  listItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 18px",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.12s ease",
  },
  itemIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    flexShrink: 0,
  },
  itemLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    color: "#0d1f3c",
    flex: 1,
  },
};

export default Settings;
