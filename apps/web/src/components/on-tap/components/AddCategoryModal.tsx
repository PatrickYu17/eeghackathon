import { useState } from "react";

export function AddCategoryModal({ onConfirm, onClose }: { onConfirm?: (name: string) => void; onClose?: () => void }) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm && onConfirm(trimmed);
    setName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose && onClose();
  };

  return (
    <div className="modal-backdrop" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.heading}>Add custom category</h2>
            <p style={styles.subheading}>Name your inventory category</p>
          </div>
          <button className="icon-animate" style={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ ...styles.inputWrap, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>
          <label style={styles.label}>Category name</label>
          <input
            className="input-animate"
            style={styles.input}
            type="text"
            placeholder="e.g. Cider, Sake, Non-alcoholic..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div style={{ ...styles.btnRow, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>
          <button className="btn-animate" style={styles.backBtn} onClick={onClose}>Cancel</button>
          <button
            className="btn-animate"
            style={{
              ...styles.confirmBtn,
              opacity: name.trim() ? 1 : 0.5,
              cursor: name.trim() ? "pointer" : "not-allowed",
            }}
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            Add category
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
    marginBottom: "20px",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "20px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: 0,
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
  inputWrap: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#0d1f3c",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px 14px",
    outline: "none",
    background: "#fff",
  },
  btnRow: {
    display: "flex",
    gap: "10px",
  },
  backBtn: {
    flex: "0 0 auto",
    padding: "14px 24px",
    background: "transparent",
    color: "#0d1f3c",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
  confirmBtn: {
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
