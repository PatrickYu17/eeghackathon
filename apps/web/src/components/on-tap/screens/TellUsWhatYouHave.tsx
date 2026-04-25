"use client";

import { useState } from "react";
import { AddCategoryModal } from "../components/AddCategoryModal";

export type CustomCategory = { id: string; label: string };

export function TellUsWhatYouHave({
  onNext,
  onBack,
  onOpenModal,
  selectedCategories,
  customCategories,
  onAddCustomCategory,
  onRemoveCustomCategory,
  onOpenCustomModal,
}: {
  onNext?: (selected: string[]) => void;
  onBack?: () => void;
  onOpenModal?: (cat: "spirits" | "mixers" | "wine" | "beer") => void;
  selectedCategories?: string[];
  customCategories?: CustomCategory[];
  onAddCustomCategory?: (cat: CustomCategory) => void;
  onRemoveCustomCategory?: (id: string) => void;
  onOpenCustomModal?: (id: string, label: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(selectedCategories ?? ["spirits", "beer"]);
  const [showAddModal, setShowAddModal] = useState(false);

  const builtInCategories = [
    { id: "spirits", label: "Spirits", sub: "Vodka, tequila..." },
    { id: "beer", label: "Beer", sub: "Bottles, kegs..." },
    { id: "wine", label: "Wine", sub: "Red, white, rosé..." },
    { id: "mixers", label: "Mixers", sub: "Juice, soda..." },
  ];

  const allCategories: Array<{ id: string; label: string; sub: string }> = [
    ...builtInCategories,
    ...(customCategories ?? []).map((c) => ({ id: c.id, label: c.label, sub: "Custom category" })),
  ];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      return next;
    });
  };

  const handleTileClick = (id: string, isCustom: boolean) => {
    toggle(id);
    if (id === "spirits" || id === "wine" || id === "mixers" || id === "beer") {
      onOpenModal && onOpenModal(id);
    } else if (isCustom) {
      const catLabel = (customCategories ?? []).find((c) => c.id === id)?.label ?? "Custom";
      onOpenCustomModal && onOpenCustomModal(id, catLabel);
    }
  };

  const handleAddCategory = (name: string) => {
    const id = `custom-${Date.now()}`;
    const cat: CustomCategory = { id, label: name };
    onAddCustomCategory && onAddCustomCategory(cat);
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setShowAddModal(false);
  };

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
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.08s both" }}>Tell us what you have</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.14s both" }}>Select your alcohol types to set up inventory</p>

        {/* Grid */}
        <div className="stagger-children" style={styles.grid}>
          {allCategories.map((cat) => {
            const isSelected = selected.includes(cat.id);
            const isCustom = cat.id.startsWith("custom-");
            return (
              <button
                key={cat.id}
                className="card-animate"
                style={{
                  ...styles.tile,
                  ...(isSelected ? styles.tileSelected : {}),
                  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  transform: isSelected ? "scale(1.02)" : "scale(1)",
                }}
                onClick={() => handleTileClick(cat.id, isCustom)}
              >
                <span style={styles.tileTitle}>{cat.label}</span>
                <span style={styles.tileSub}>{cat.sub}</span>
                {isCustom && onRemoveCustomCategory && (
                  <span
                    className="icon-animate"
                    style={styles.removeCustom}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCustomCategory(cat.id);
                      setSelected((prev) => prev.filter((s) => s !== cat.id));
                    }}
                    title="Remove category"
                  >
                    ×
                  </span>
                )}
              </button>
            );
          })}

          {/* Add more */}
          <button className="card-animate" style={styles.tileAdd} onClick={() => setShowAddModal(true)}>
            <span style={styles.addPlus}>+</span>
            <span style={styles.addLabel}>Add more</span>
          </button>
        </div>

        {/* Buttons */}
        <div style={{ ...styles.btnRow, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.35s both" }}>
          <button className="btn-animate" style={styles.backBtn} onClick={onBack}>
            Back
          </button>
          <button className="btn-animate" style={styles.nextBtn} onClick={() => onNext && onNext(selected)}>
            Next
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddCategoryModal
          onConfirm={handleAddCategory}
          onClose={() => setShowAddModal(false)}
        />
      )}
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
    padding: "32px 28px",
    width: "100%",
    maxWidth: "420px",
    margin: "40px 20px",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "24px",
  },
  tile: {
    position: "relative",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background 0.15s ease",
    textAlign: "center",
  },
  tileSelected: {
    border: "2px solid #0d1f3c",
    background: "#f5f6f8",
  },
  tileTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0d1f3c",
    letterSpacing: "-0.01em",
  },
  tileSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "400",
  },
  removeCustom: {
    position: "absolute",
    top: "6px",
    right: "8px",
    fontSize: "16px",
    color: "#9ca3af",
    cursor: "pointer",
    lineHeight: 1,
    padding: "2px 4px",
    borderRadius: "4px",
    transition: "color 0.12s ease",
  },
  tileAdd: {
    background: "#ffffff",
    border: "1px dashed #d1d5db",
    borderRadius: "12px",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    cursor: "pointer",
    textAlign: "center",
  },
  addPlus: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "18px",
    color: "#9ca3af",
    fontWeight: "300",
    lineHeight: "1",
  },
  addLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#9ca3af",
    fontWeight: "400",
  },
  btnRow: {
    display: "flex",
    gap: "10px",
  },
  backBtn: {
    flex: "0 0 auto",
    padding: "15px 24px",
    background: "transparent",
    color: "#0d1f3c",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "500",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
  },
  nextBtn: {
    flex: 1,
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
  },
};
