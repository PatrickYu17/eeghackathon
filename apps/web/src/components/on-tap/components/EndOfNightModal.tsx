"use client";

import { useCallback, useEffect, useState } from "react";
import { getNightRecommendations } from "../../../lib/on-tap-api";
import type { NightRecommendation } from "../../../lib/on-tap-types";

export function EndOfNightModal({
  nightId,
  nightDate,
  bottlesUsed,
  alertsFlagged,
  bartendersOn,
  onClose,
}: {
  nightId: string;
  nightDate: string;
  bottlesUsed: number;
  alertsFlagged: number;
  bartendersOn: number;
  onClose: () => void;
}) {
  const [recommendations, setRecommendations] = useState<NightRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNightRecommendations(nightId);
      setRecommendations(data.recommendations);
    } catch (e) {
      setError("Could not load recommendations.");
    } finally {
      setLoading(false);
    }
  }, [nightId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Night Closed</h2>
            <p style={styles.subtitle}>{nightDate}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <p style={styles.statLabel}>bottles used</p>
            <p style={styles.statNum}>{bottlesUsed}</p>
          </div>
          <div style={styles.statBox}>
            <p style={styles.statLabel}>alerts flagged</p>
            <p style={{ ...styles.statNum, color: alertsFlagged > 0 ? "#ef4444" : "#0d1f3c" }}>{alertsFlagged}</p>
          </div>
          <div style={styles.statBox}>
            <p style={styles.statLabel}>bartenders on</p>
            <p style={styles.statNum}>{bartendersOn}</p>
          </div>
        </div>

        <div style={styles.section}>
          <p style={styles.sectionLabel}>restock recommendations</p>
          {loading ? (
            <p style={styles.empty}>Loading recommendations…</p>
          ) : error ? (
            <p style={styles.empty}>{error}</p>
          ) : recommendations.length === 0 ? (
            <p style={styles.empty}>No recommendations available.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, textAlign: "left" }}>Alcohol Type</th>
                    <th style={styles.th}>Used</th>
                    <th style={styles.th}>Full Stock</th>
                    <th style={styles.th}>% Used</th>
                    <th style={{ ...styles.th, textAlign: "left" }}>Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((rec) => {
                    const rowColor =
                      rec.status === "over_ordered"
                        ? "#fef9c3"
                        : rec.status === "balanced"
                        ? "#dcfce7"
                        : "#fee2e2";
                    const borderColor =
                      rec.status === "over_ordered"
                        ? "#f59e0b"
                        : rec.status === "balanced"
                        ? "#16a34a"
                        : "#ef4444";
                    return (
                      <tr key={rec.categoryId} style={{ background: rowColor, borderLeft: `4px solid ${borderColor}` }}>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{rec.categoryName}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{rec.totalUsed}</td>
                        <td style={{ ...styles.td, textAlign: "center" }}>{rec.fullStock}</td>
                        <td style={{ ...styles.td, textAlign: "center", fontWeight: 600 }}>{rec.pctUsed}%</td>
                        <td style={styles.td}>{rec.message}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={styles.note}>Based on tonight&apos;s usage.</p>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button className="btn-animate" style={styles.doneBtn} onClick={onClose}>
            Back to Dashboard
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
    background: "rgba(13,31,60,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "24px",
    animation: "fadeIn 0.2s ease",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "720px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
    animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px 28px 0",
  },
  title: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "22px",
    fontWeight: 600,
    color: "#0d1f3c",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
    margin: "4px 0 0",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
    margin: "20px 28px 0",
    background: "#fff",
  },
  statBox: {
    padding: "16px 20px",
    borderRight: "1px solid #e5e7eb",
  },
  statLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
    margin: "0 0 6px",
  },
  statNum: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "28px",
    fontWeight: 600,
    color: "#0d1f3c",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  section: {
    padding: "20px 28px 0",
  },
  sectionLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
    margin: "0 0 12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 600,
  },
  tableWrap: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#0d1f3c",
  },
  th: {
    padding: "10px 12px",
    background: "#f8f8f6",
    fontWeight: 600,
    fontSize: "11px",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "center",
  },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  },
  note: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#9ca3af",
    margin: 0,
    padding: "10px 12px",
    background: "#fafafa",
    borderTop: "1px solid #f3f4f6",
  },
  empty: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#9ca3af",
    margin: 0,
    padding: "16px 0",
  },
  footer: {
    padding: "20px 28px 24px",
    display: "flex",
    justifyContent: "flex-end",
  },
  doneBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: 500,
    color: "#ffffff",
    background: "#0d1f3c",
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    cursor: "pointer",
  },
};
