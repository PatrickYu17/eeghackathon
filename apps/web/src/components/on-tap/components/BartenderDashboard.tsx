"use client";

import { useMemo, useState } from "react";

export function BartenderDashboard({
  staffName = "Nick",
  data,
  totalBottles,
  loading,
  onClockOut,
  onBottleDone,
  onUndo,
  onReload,
  onRestockCategory,
}: {
  staffName?: string;
  data: import("../../../lib/on-tap-types").BartenderDashboardResponse | null;
  totalBottles: number;
  loading: boolean;
  onClockOut?: () => void;
  onBottleDone?: (productId: string, categoryId?: string) => Promise<boolean>;
  onUndo?: (usageLogId: string) => Promise<boolean>;
  onReload?: () => void;
  onRestockCategory?: (categoryId: string) => Promise<boolean>;
}) {
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const categories = useMemo(() => {
    if (!data?.categories) return [];
    const usageMap = new Map(
      data.usageByCategory?.map((u) => [u.categoryId, u.bottlesUsed]) ?? []
    );

    const trackedAlcohols = new Set(["vodka", "tequila", "gin", "beer", "soju"]);

    return data.categories.map((category) => {
      const count = usageMap.get(category.id) || 0;
      const isKeg = category.type === "keg";
      const isTracked = trackedAlcohols.has(category.name.toLowerCase());

      type AlertItem = {
        type: "get-more" | "watch-overpour" | "low-stock" | "keg";
        title: string;
        sub: string;
      };

      const alerts: AlertItem[] = [];

      if (isKeg) {
        alerts.push({
          type: "keg",
          title: "CHECK KEG",
          sub: "running low — weigh and update",
        });
      } else if (isTracked) {
        const getMoreThreshold = category.parLevel / 6;
        const overpourThreshold = category.parLevel / 12;

        if (category.currentStock <= overpourThreshold) {
          alerts.push({
            type: "watch-overpour",
            title: "WATCH OVERPOUR",
            sub: "stock critically low — double-check pours",
          });
        }
        if (category.currentStock <= getMoreThreshold) {
          alerts.push({
            type: "get-more",
            title: `GET MORE ${category.name.toUpperCase()}`,
            sub: "grab from back now",
          });
        }
      } else {
        if (category.currentStock < category.parLevel) {
          alerts.push({
            type: "low-stock",
            title: "LOW STOCK",
            sub: "stock below par — tell manager",
          });
        }
      }

      // Sort so GET MORE appears above WATCH OVERPOUR when both fire
      alerts.sort((a, b) => {
        const order = { "get-more": 0, "watch-overpour": 1, "low-stock": 2, keg: 3 };
        return order[a.type] - order[b.type];
      });

      return {
        id: category.id,
        label: category.name,
        count,
        alerts,
        currentStock: category.currentStock,
        parLevel: category.parLevel,
        canRestock: category.currentStock < category.parLevel,
        isKeg,
        firstProductId: category.products[0]?.id,
      };
    });
  }, [data]);

  const getCardStyle = (alerts: { type: string }[]) => {
    const hasOverpour = alerts.some((a) => a.type === "watch-overpour");
    const hasGetMore = alerts.some((a) => a.type === "get-more");
    const hasLow = alerts.some((a) => a.type === "low-stock");
    const hasKeg = alerts.some((a) => a.type === "keg");

    if (hasOverpour)
      return { background: "#fee2e2", border: "1.5px solid #ef4444" };
    if (hasGetMore || hasLow)
      return { background: "#fef9c3", border: "1.5px solid #f59e0b" };
    if (hasKeg)
      return { background: "#eff6ff", border: "1.5px solid #3b82f6" };
    return { background: "#ffffff", border: "1px solid #e5e7eb" };
  };

  const getAlertStyle = (type: string) => {
    if (type === "get-more" || type === "low-stock")
      return { background: "#f59e0b", color: "#1a0f00" };
    if (type === "watch-overpour")
      return { background: "#ef4444", color: "#ffffff" };
    if (type === "keg") return { background: "#3b82f6", color: "#ffffff" };
    return {};
  };

  const handleRestock = async (categoryId: string) => {
    if (!onRestockCategory || restockingId) return;
    setRestockingId(categoryId);
    try {
      await onRestockCategory(categoryId);
    } finally {
      setRestockingId(null);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={{ ...styles.header, animation: "fadeInDown 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.avatar, animation: "scaleIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
            <span style={styles.avatarLetter}>{staffName.charAt(0)}</span>
          </div>
          <div>
            <p style={{ ...styles.helloText, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>hello, {staffName}</p>
            <p style={{ ...styles.shiftText, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>
              shift started {timeStr} · {dateStr}
            </p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <p style={styles.bottlesLabel}>bottles used</p>
          <p style={{ ...styles.bottlesCount, animation: "countBump 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>{totalBottles}</p>
          <button className="btn-animate" style={styles.clockOut} onClick={onClockOut}>
            clock out
          </button>
        </div>
      </div>

      {/* Subtitle */}
      <p style={{ ...styles.subtitle, animation: "fadeIn 0.5s ease 0.2s both" }}>tap when a bottle is finished</p>

      {/* Grid */}
      {loading ? (
        <p style={{ ...styles.subtitle, animation: "fadeIn 0.3s ease" }}>Loading...</p>
      ) : (
        <div style={styles.grid}>
          {categories.map((bottle, index) => {
            const cardStyle = getCardStyle(bottle.alerts);
            return (
              <div
                key={bottle.id}
                className="dashboard-card"
                style={{
                  ...styles.card,
                  ...cardStyle,
                  animationDelay: `${0.1 + index * 0.06}s`,
                }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.cardLabel}>{bottle.label}</span>
                </div>
                <p style={{ ...styles.cardCount, animation: bottle.count > 0 ? "countBump 0.3s cubic-bezier(0.25, 1, 0.5, 1)" : "none" }}>{bottle.count}</p>
                {bottle.alerts.map((alert) => (
                  <div
                    key={alert.type}
                    style={{
                      ...styles.alertBanner,
                      ...getAlertStyle(alert.type),
                      animation: "pulse 2s ease infinite",
                    }}
                  >
                    <p style={styles.alertTitle}>{alert.title}</p>
                    <p style={styles.alertSub}>{alert.sub}</p>
                  </div>
                ))}
                <div style={styles.stockRow}>
                  <span style={styles.stockText}>
                    stock {bottle.currentStock}/{bottle.parLevel}
                  </span>
                  {bottle.canRestock && (
                    <button
                      className="btn-animate"
                      style={styles.restockBtn}
                      onClick={() => handleRestock(bottle.id)}
                      disabled={restockingId !== null}
                    >
                      {restockingId === bottle.id ? "restocking..." : "restock"}
                    </button>
                  )}
                </div>
                <button
                  className="btn-animate"
                  style={styles.doneBtn}
                  onClick={() => {
                    if (bottle.firstProductId && onBottleDone) {
                      onBottleDone(bottle.firstProductId, bottle.id);
                    }
                  }}
                >
                  {bottle.isKeg ? "keg checked" : "bottle done"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: "100vw",
    minHeight: "100vh",
    background: "#0d1f3c",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "16px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#0d1f3c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "15px",
    fontWeight: "600",
    color: "#ffffff",
  },
  helloText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "15px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 2px",
  },
  shiftText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
    margin: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    textAlign: "right",
  },
  bottlesLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "11px",
    color: "#6b7280",
    margin: 0,
    textAlign: "right",
  },
  bottlesCount: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "28px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: 0,
    lineHeight: "1",
  },
  clockOut: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
    background: "transparent",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "6px 14px",
    cursor: "pointer",
  },
  subtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#a8b8cc",
    margin: "20px 32px 12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    padding: "0 32px 32px",
    flex: 1,
  },
  card: {
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "18px",
    fontWeight: "600",
    color: "#0d1f3c",
    letterSpacing: "-0.01em",
  },
  undoBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#9ca3af",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  cardCount: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "48px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: 0,
    lineHeight: "1",
  },
  stockRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    margin: "10px 0 12px",
  },
  stockText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#6b7280",
  },
  restockBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    fontWeight: "600",
    color: "#0d1f3c",
    background: "#e0f2fe",
    border: "1px solid #7dd3fc",
    borderRadius: "7px",
    padding: "7px 12px",
    cursor: "pointer",
  },
  alertBanner: {
    borderRadius: "8px",
    padding: "10px 14px",
  },
  alertTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "16px",
    fontWeight: "700",
    margin: "0 0 4px",
    letterSpacing: "0.02em",
  },
  alertSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    margin: 0,
    opacity: 0.9,
  },
  doneBtn: {
    width: "100%",
    padding: "13px",
    background: "#0d1f3c",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    marginTop: "auto",
  },
};
