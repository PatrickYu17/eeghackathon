import { useState } from "react";

const BeerModal = ({ onConfirm, onClose }) => {
  const [items, setItems] = useState([
    { id: "stella", label: "Stella Artois", qty: 24, selected: true },
    { id: "heineken", label: "Heineken", qty: 12, selected: true },
    { id: "corona", label: "Corona", qty: 0, selected: false },
    { id: "imported", label: "Imported / Other", qty: 0, selected: false },
    { id: "bud", label: "Budweiser", qty: 0, selected: false },
    { id: "coors", label: "Coors Light", qty: 0, selected: false },
    { id: "modelo", label: "Modelo", qty: 0, selected: false },
    { id: "ipa", label: "IPA / Craft", qty: 0, selected: false },
  ]);
  const [customInput, setCustomInput] = useState("");

  const toggleItem = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateQty = (id, val) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, Number(val) || 0) } : item
      )
    );
  };

  const addCustomItem = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    const id = `custom-${Date.now()}`;
    setItems((prev) => [...prev, { id, label: trimmed, qty: 0, selected: true }]);
    setCustomInput("");
  };

  const handleCustomKey = (e) => {
    if (e.key === "Enter") addCustomItem();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.heading}>Beer — what do you carry?</h2>
            <p style={styles.subheading}>Select all that apply</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "36px" }}></th>
                <th style={{ ...styles.th, textAlign: "left" }}>Beer</th>
                <th style={{ ...styles.th, width: "120px", textAlign: "right" }}>Current qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  style={{
                    ...styles.tr,
                    background: item.selected ? "#f5f6f8" : "#fff",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <td style={styles.td}>
                    <div style={{ ...styles.checkbox, ...(item.selected ? styles.checkboxChecked : {}) }}>
                      {item.selected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </div>
                  </td>
                  <td style={{ ...styles.td, ...styles.tdLabel }}>
                    <span style={{
                      ...styles.itemLabel,
                      color: item.selected ? "#0d1f3c" : "#9ca3af",
                      fontWeight: item.selected ? "500" : "400",
                    }}>
                      {item.label}
                    </span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <div style={{
                      ...styles.qtyWrap,
                      borderColor: item.selected ? "#0d1f3c" : "#e5e7eb",
                      opacity: item.selected ? 1 : 0.4,
                    }}>
                      <input
                        style={styles.qtyInput}
                        type="number"
                        min="0"
                        value={item.selected ? item.qty : ""}
                        placeholder="—"
                        disabled={!item.selected}
                        onChange={(e) => updateQty(item.id, e.target.value)}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {/* Add custom item row */}
              <tr style={{ background: "#fff" }}>
                <td style={styles.td}></td>
                <td style={{ ...styles.td, ...styles.tdLabel }} colSpan={2}>
                  <div style={styles.addRow}>
                    <input
                      style={styles.addInput}
                      type="text"
                      placeholder="+ Add a specific beer..."
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={handleCustomKey}
                    />
                    <button style={styles.addBtn} onClick={addCustomItem}>Add</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button style={styles.backBtn} onClick={onClose}>Back</button>
          <button
            style={styles.confirmBtn}
            onClick={() => onConfirm && onConfirm(items.filter((i) => i.selected))}
          >
            Confirm
          </button>
        </div>

      </div>
    </div>
  );
};

const styles = {
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
    maxWidth: "560px",
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
  tableWrap: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "11px",
    fontWeight: "500",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "10px 14px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },
  tr: {
    cursor: "pointer",
    transition: "background 0.12s ease",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "middle",
  },
  tdLabel: {
    width: "100%",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    minWidth: "18px",
    border: "1.5px solid #d1d5db",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
  },
  checkboxChecked: {
    background: "#0d1f3c",
    borderColor: "#0d1f3c",
  },
  itemLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
  },
  qtyWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    borderRadius: "6px",
    padding: "4px 10px",
    minWidth: "52px",
  },
  qtyInput: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    color: "#0d1f3c",
    border: "none",
    outline: "none",
    width: "40px",
    textAlign: "center",
    background: "transparent",
  },
  addRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  addInput: {
    flex: 1,
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#0d1f3c",
    border: "1px dashed #d1d5db",
    borderRadius: "6px",
    padding: "7px 10px",
    outline: "none",
    background: "transparent",
  },
  addBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    fontWeight: "500",
    color: "#0d1f3c",
    background: "transparent",
    border: "1px solid #0d1f3c",
    borderRadius: "6px",
    padding: "7px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
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

export default BeerModal;
