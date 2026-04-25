"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentBarStaffRoster } from "../../../lib/on-tap-api";

type StaffRosterMember = { id: string; name: string };

export function StaffLoginScreen({
  onBack,
  onSuccess,
  onStartShift,
  barName,
}: {
  onBack: () => void;
  onSuccess: () => void;
  onStartShift: (staffMemberId: string) => Promise<boolean>;
  barName?: string;
}) {
  const [availableStaff, setAvailableStaff] = useState<StaffRosterMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffRosterMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getCurrentBarStaffRoster()
      .then((roster) => {
        if (!active) return;
        setAvailableStaff(roster.staff);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load staff roster");
        setAvailableStaff([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (error) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleStartShift = useCallback(() => {
    if (!selectedStaff) return;
    setLoading(true);
    setError(null);
    onStartShift(selectedStaff.id)
      .then((ok) => {
        if (ok) onSuccess();
        else setError("Could not start shift");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Login failed");
      })
      .finally(() => setLoading(false));
  }, [selectedStaff, onStartShift, onSuccess]);

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes staffLoginShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      {/* Wave texture */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      <div style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        {/* Back */}
        <button className="icon-animate" style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          <span style={styles.backText}>back</span>
        </button>

        {/* Icon */}
        <div style={{ ...styles.iconWrap, animation: "scaleIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.08s both" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>staff login</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.16s both" }}>{barName ? `select your name at ${barName}` : "select your name to start your shift"}</p>

        {error && (
          <p style={{ ...styles.errorText, animation: "shake 0.4s ease" }}>{error}</p>
        )}

        {loading && availableStaff.length === 0 && <p style={{ ...styles.staffLabel, animation: "fadeIn 0.3s ease" }}>loading staff roster...</p>}

        {!loading && !error && availableStaff.length === 0 && <p style={{ ...styles.staffLabel, animation: "fadeIn 0.3s ease" }}>No active staff found for this bar.</p>}

        <div style={{ ...styles.staffSection, ...(shake ? { animation: "staffLoginShake 0.35s ease" } : {}) }}>
          {availableStaff.length > 0 && (
            <>
            <p style={{ ...styles.staffLabel, animation: "fadeIn 0.3s ease" }}>choose who is clocking in</p>
            <div className="stagger-children" style={styles.staffList}>
              {availableStaff.map((s) => {
                const selected = selectedStaff?.id === s.id;
                return (
                  <button
                    key={s.id}
                    className="card-animate"
                    style={{
                      ...styles.staffRow,
                      ...(selected ? styles.staffRowSelected : {}),
                      transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                    }}
                    onClick={() => setSelectedStaff(s)}
                  >
                    <span
                      style={{
                        ...styles.staffInitial,
                        ...(selected ? styles.staffInitialSelected : {}),
                        transition: "all 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
                      }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={styles.staffName}>{s.name}</span>
                    {selected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "checkPop 0.3s cubic-bezier(0.25, 1, 0.5, 1)" }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            </>
          )}
        </div>

        {availableStaff.length > 0 && (
          <button
            className="btn-animate"
            style={{
              ...styles.startBtn,
              opacity: selectedStaff && !loading ? 1 : 0.5,
              cursor: selectedStaff && !loading ? "pointer" : "not-allowed",
              animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.3s both",
            }}
            disabled={!selectedStaff || loading}
            onClick={handleStartShift}
          >
            {loading ? "starting..." : "start shift"}
          </button>
        )}
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
  card: {
    position: "relative",
    zIndex: 1,
    background: "#ffffff",
    borderRadius: "20px",
    padding: "32px 28px",
    width: "100%",
    maxWidth: "400px",
    margin: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0 0 20px",
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
  },
  iconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#0d1f3c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "14px",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "22px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
    textAlign: "center",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 24px",
    textAlign: "center",
  },
  errorText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#ef4444",
    margin: "0 0 16px",
    textAlign: "center",
  },
  staffSection: {
    width: "100%",
  },
  staffLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 12px",
    textAlign: "center",
  },
  staffList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxHeight: "260px",
    overflowY: "auto",
    paddingRight: "4px",
    marginBottom: "24px",
  },
  staffRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    cursor: "pointer",
    transition: "all 0.12s",
    textAlign: "left",
  },
  staffRowSelected: {
    background: "#f0f4ff",
    borderColor: "#0d1f3c",
  },
  staffInitial: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    flexShrink: 0,
  },
  staffInitialSelected: {
    background: "#0d1f3c",
    color: "#ffffff",
  },
  staffName: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    color: "#0d1f3c",
    flex: 1,
  },
  startBtn: {
    width: "100%",
    padding: "15px",
    background: "#0d1f3c",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
    transition: "opacity 0.15s",
  },
};
