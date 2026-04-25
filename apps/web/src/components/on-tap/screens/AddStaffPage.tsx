"use client";

import { useRef, useState } from "react";

export function AddStaffPage({
  onDone,
  onBack,
  error,
  loading,
}: {
  onDone?: (staff: { name: string }[]) => void;
  onBack?: () => void;
  error?: string | null;
  loading?: boolean;
}) {
  const [staff, setStaff] = useState<{ id: number; name: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addStaff = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setStaff((prev) => [...prev, { id: Date.now(), name: trimmed }]);
    setNewName("");
    inputRef.current?.focus();
  };

  const removeStaff = (id: number) => setStaff((prev) => prev.filter((s) => s.id !== id));

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const handleRowClick = () => {
    inputRef.current?.focus();
  };

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
      <div style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.08s both" }}>Add Your Staff</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.14s both" }}>Add bartenders so they can log bottles tonight</p>

        {/* Staff list */}
        <div style={styles.list}>
          {staff.map((member, index) => (
            <div key={member.id} style={{ ...styles.staffRow, animation: `fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) ${0.1 + index * 0.05}s both` }}>
              <div style={styles.avatar}>
                <span style={styles.avatarLetter}>{getInitial(member.name)}</span>
              </div>
              <span style={styles.staffName}>{member.name}</span>
              <button className="icon-animate" style={styles.removeBtn} onClick={() => removeStaff(member.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}

          {/* Add name row */}
          <div
            style={{
              ...styles.addRow,
              ...(isFocused ? styles.addRowFocused : {}),
              animation: staff.length === 0 ? "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.2s both" : "none",
            }}
            onClick={handleRowClick}
          >
            <div style={{
              ...styles.addCircle,
              ...(isFocused ? styles.addCircleFocused : {}),
              transition: "all 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isFocused ? "#ffffff" : "#9ca3af"} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
            <input
              ref={inputRef}
              style={{
                ...styles.addInput,
                ...(isFocused ? styles.addInputFocused : {}),
              }}
              type="text"
              placeholder="add name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStaff()}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {newName.trim() && (
              <button className="btn-animate" style={styles.addBtn} onClick={addStaff}>Add</button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{ ...errorStyle, animation: "shake 0.4s ease" }}>{error}</p>
        )}

        {/* Buttons */}
        <div style={{ ...styles.btnRow, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.3s both" }}>
          <button className="btn-animate" style={styles.backBtn} onClick={onBack}>Back</button>
          <button
            className="btn-animate"
            style={{
              ...styles.doneBtn,
              opacity: loading ? 0.6 : 1,
            }}
            disabled={loading}
            onClick={() => onDone && onDone(staff.map((s) => ({ name: s.name })))}
          >
            {loading ? "Creating..." : "Done — Go to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

const errorStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "#ef4444",
  margin: "0 0 12px",
  textAlign: "center",
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "auto",
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
    padding: "36px 40px",
    width: "100%",
    maxWidth: "520px",
    margin: "40px 24px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "24px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 24px",
    lineHeight: "1.5",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "28px",
  },
  staffRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px 16px",
    background: "#fff",
  },
  avatar: {
    width: "32px",
    height: "32px",
    minWidth: "32px",
    borderRadius: "50%",
    background: "#0d1f3c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
  },
  staffName: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    color: "#0d1f3c",
    flex: 1,
  },
  removeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  addRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px dashed #d1d5db",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "text",
    transition: "all 0.15s ease",
  },
  addRowFocused: {
    border: "1.5px solid #0d1f3c",
    background: "#f8fafc",
  },
  addCircle: {
    width: "32px",
    height: "32px",
    minWidth: "32px",
    borderRadius: "50%",
    border: "1px solid #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },
  addCircleFocused: {
    border: "1px solid #0d1f3c",
    background: "#0d1f3c",
  },
  addInput: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#111827",
    border: "none",
    outline: "none",
    flex: 1,
    background: "transparent",
    cursor: "text",
  },
  addInputFocused: {
    color: "#0d1f3c",
  },
  addBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    fontWeight: "500",
    color: "#0d1f3c",
    background: "transparent",
    border: "1px solid #0d1f3c",
    borderRadius: "6px",
    padding: "5px 12px",
    cursor: "pointer",
  },
  btnRow: {
    display: "flex",
    gap: "10px",
  },
  backBtn: {
    flex: "0 0 auto",
    padding: "14px 28px",
    background: "transparent",
    color: "#0d1f3c",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
  doneBtn: {
    flex: 1,
    padding: "14px",
    background: "#0d1f3c",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
};
