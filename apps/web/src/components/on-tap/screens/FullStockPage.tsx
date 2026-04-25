"use client";

import { useState } from "react";

export type SelectedItem = { id: string; label: string; qty: number };
export type CustomCategory = { id: string; label: string };

const defaultStock: Record<string, SelectedItem[]> = {
  spirits: [
    { id: "vodka", label: "Vodka", qty: 24 },
    { id: "tequila", label: "Tequila", qty: 12 },
    { id: "gin", label: "Gin", qty: 8 },
    { id: "rum", label: "Rum", qty: 6 },
  ],
  beer: [
    { id: "stella", label: "Stella Artois", qty: 48 },
    { id: "heineken", label: "Heineken", qty: 24 },
    { id: "corona", label: "Corona", qty: 12 },
  ],
  wine: [
    { id: "red", label: "Red Wine", qty: 0 },
    { id: "white", label: "White Wine", qty: 0 },
  ],
  mixers: [
    { id: "soda", label: "Soda Water", qty: 0 },
    { id: "tonic", label: "Tonic Water", qty: 0 },
    { id: "oj", label: "Orange Juice", qty: 0 },
  ],
};

export function FullStockPage({
  onNext,
  onBack,
  initialItems,
  selectedCategories,
  customCategories,
}: {
  onNext?: (stock: Record<string, SelectedItem[]>) => void;
  onBack?: () => void;
  initialItems?: Record<string, SelectedItem[]>;
  selectedCategories?: string[];
  customCategories?: CustomCategory[];
}) {
  const [stock, setStock] = useState<Record<string, SelectedItem[]>>(() => {
    if (!initialItems) return defaultStock;
    const merged: Record<string, SelectedItem[]> = {};
    for (const key of Object.keys(defaultStock)) {
      merged[key] = initialItems[key] ?? defaultStock[key];
    }
    // Merge custom category items
    for (const key of Object.keys(initialItems)) {
      if (!merged[key]) merged[key] = initialItems[key];
    }
    return merged;
  });

  const selectedSet = new Set(selectedCategories ?? ["spirits", "beer"]);

  const updateQty = (category: string, id: string, val: string) => {
    setStock((prev) => ({
      ...prev,
      [category]: prev[category].map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, Number(val) || 0) } : item
      ),
    }));
  };

  const addCustomItem = (category: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setStock((prev) => {
      const existing = prev[category] ?? [];
      return {
        ...prev,
        [category]: [...existing, { id: `item-${Date.now()}`, label: trimmed, qty: 0 }],
      };
    });
  };

  const removeCustomItem = (category: string, id: string) => {
    setStock((prev) => ({
      ...prev,
      [category]: prev[category].filter((item) => item.id !== id),
    }));
  };

  const builtInCategories = [
    { key: "spirits", label: "Spirits", sub: "Vodka, tequila...", selected: selectedSet.has("spirits") },
    { key: "beer", label: "Beer", sub: "Bottles, kegs...", selected: selectedSet.has("beer") },
    { key: "wine", label: "Wine", sub: "Red, white, rosé...", selected: selectedSet.has("wine") },
    { key: "mixers", label: "Mixers", sub: "Juice, soda...", selected: selectedSet.has("mixers") },
  ];

  const customCats = (customCategories ?? [])
    .filter((c) => selectedSet.has(c.id))
    .map((c) => ({ key: c.id, label: c.label, sub: "Custom category", selected: true }));

  const allCategories = [
    ...builtInCategories.filter((c) => c.selected),
    ...customCats,
  ];

  return (
    <div style={styles.root}>
      {/* Wave */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6"/>
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4"/>
        </svg>
      </div>

      {/* Card */}
      <div style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        {/* Header */}
        <div style={{ ...styles.headerRow, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.08s both" }}>
          <div>
            <h1 style={styles.heading}>Full Stock</h1>
            <p style={styles.subheading}>How much do you need to be fully stocked?</p>
          </div>
        </div>

        {/* Grid */}
        <div className="stagger-children" style={styles.grid}>
          {allCategories.map((cat) => (
            <div
              key={cat.key}
              className="card-animate"
              style={{
                ...styles.tile,
                ...(cat.selected ? styles.tileSelected : {}),
                transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
              <p style={styles.tileTitle}>{cat.label}</p>
              <p style={styles.tileSub}>{cat.sub}</p>
              <div style={styles.itemList}>
                {(stock[cat.key] ?? []).map((item) => (
                  <div key={item.id} style={styles.itemRow}>
                    <span style={styles.itemLabel}>{item.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div className="input-animate" style={{
                        ...styles.qtyWrap,
                        borderColor: cat.selected ? "#0d1f3c" : "#e5e7eb",
                        opacity: cat.selected ? 1 : 0.5,
                      }}>
                        <input
                          style={styles.qtyInput}
                          type="number"
                          min="0"
                          value={cat.selected ? item.qty : ""}
                          placeholder="—"
                          disabled={!cat.selected}
                          onChange={(e) => updateQty(cat.key, item.id, e.target.value)}
                        />
                      </div>
                      {cat.key.startsWith("custom-") && (
                        <button
                          className="icon-animate"
                          style={styles.removeItemBtn}
                          onClick={() => removeCustomItem(cat.key, item.id)}
                          title="Remove item"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {cat.key.startsWith("custom-") && (
                  <AddCustomItemRow onAdd={(label) => addCustomItem(cat.key, label)} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ ...styles.btnRow, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.35s both" }}>
          <button className="btn-animate" style={styles.backBtn} onClick={onBack}>Back</button>
          <button className="btn-animate" style={styles.nextBtn} onClick={() => onNext && onNext(stock)}>Next</button>
        </div>
      </div>
    </div>
  );
}

function AddCustomItemRow({ onAdd }: { onAdd: (label: string) => void }) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    onAdd(value);
    setValue("");
  };

  return (
    <div style={styles.addItemRow}>
      <input
        style={styles.addItemInput}
        type="text"
        placeholder="+ Add item..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <button style={styles.addItemBtn} onClick={handleAdd}>Add</button>
    </div>
  );
}

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
    maxWidth: "860px",
    margin: "40px 24px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
  },
  headerRow: {
    marginBottom: "28px",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "26px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 6px",
    letterSpacing: "-0.02em",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
    lineHeight: "1.5",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "24px",
  },
  tile: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    background: "#fff",
  },
  tileSelected: {
    border: "2px solid #0d1f3c",
    background: "#fff",
  },
  tileTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "15px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 3px",
    letterSpacing: "-0.01em",
  },
  tileSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#9ca3af",
    margin: "0 0 14px",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#374151",
  },
  qtyWrap: {
    border: "1px solid",
    borderRadius: "6px",
    padding: "4px 10px",
    minWidth: "52px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: "500",
    color: "#0d1f3c",
    border: "none",
    outline: "none",
    width: "36px",
    textAlign: "center",
    background: "transparent",
  },
  removeItemBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "16px",
    lineHeight: 1,
    padding: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  addItemRow: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    marginTop: "4px",
  },
  addItemInput: {
    flex: 1,
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#0d1f3c",
    border: "1px dashed #d1d5db",
    borderRadius: "6px",
    padding: "5px 8px",
    outline: "none",
    background: "transparent",
  },
  addItemBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "11px",
    fontWeight: "500",
    color: "#0d1f3c",
    background: "transparent",
    border: "1px solid #0d1f3c",
    borderRadius: "6px",
    padding: "5px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
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
  nextBtn: {
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
