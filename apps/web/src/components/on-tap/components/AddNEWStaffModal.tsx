import { useState } from "react";

export function AddNEWStaffModal({
  onAdd,
  onClose,
}: {
  onAdd?: (name: string) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd && onAdd(name.trim());
    onClose && onClose();
  };

  return (
    <div className="modal-backdrop" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.heading}>Add a Staff Member</h2>
          <button className="icon-animate" style={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <p style={{ ...styles.subheading, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.05s both" }}>Enter their name so they can select it at login</p>

        {/* Input */}
        <div className="input-animate" style={{ ...styles.inputWrap, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>
          <div style={{ ...styles.avatarPreview, transition: "all 0.3s ease" }}>
            <span style={styles.avatarLetter}>
              {name.trim() ? name.trim().charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Nick"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
        </div>

        {/* Buttons */}
        <div style={{ ...styles.btnRow, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>
          <button className="btn-animate" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className="btn-animate"
            style={{
              ...styles.addBtn,
              opacity: name.trim() ? 1 : 0.4,
              cursor: name.trim() ? "pointer" : "default",
            }}
            onClick={handleAdd}
            disabled={!name.trim()}
          >
            Add Staff Member
          </button>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(13,31,60,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    fontFamily: "'Inter', sans-serif",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "28px",
    width: "100%",
    maxWidth: "420px",
    margin: "20px",
    boxShadow: "0 16px 60px rgba(0,0,0,0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "6px",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "20px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: "0 0 24px",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1.5px solid #0d1f3c",
    borderRadius: "10px",
    padding: "12px 16px",
    marginBottom: "20px",
  },
  avatarPreview: {
    width: "36px",
    height: "36px",
    minWidth: "36px",
    borderRadius: "50%",
    background: "#0d1f3c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
  },
  input: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "15px",
    color: "#0d1f3c",
    border: "none",
    outline: "none",
    flex: 1,
    background: "transparent",
    letterSpacing: "-0.01em",
  },
  btnRow: {
    display: "flex",
    gap: "10px",
  },
  cancelBtn: {
    flex: "0 0 auto",
    padding: "13px 24px",
    background: "transparent",
    color: "#0d1f3c",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
  addBtn: {
    flex: 1,
    padding: "13px",
    background: "#0d1f3c",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "-0.01em",
    transition: "opacity 0.15s ease",
  },
};
