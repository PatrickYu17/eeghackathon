"use client";

import Image from "next/image";
import { useState } from "react";
import type { AiReport, AiReportContent, ManagerNightSummary, OnTapCategory } from "../../../lib/on-tap-types";

export function ManagerDashboard({
  nights,
  categories,
  selectedNightId,
  currentNightId,
  onSelectNight,
  onSettings,
  onCloseNight,
  onExport,
  onRestockCategory,
  aiReports = [],
  aiReportsLoading = false,
  aiReportGenerating = false,
  onGenerateAiReport,
  onDownloadAiReport,
  onStaffMode,
  loading,
  barName,
}: {
  nights: ManagerNightSummary[];
  categories?: OnTapCategory[];
  selectedNightId: string | null;
  currentNightId?: string | null;
  onSelectNight: (id: string) => void;
  onSettings?: () => void;
  onCloseNight?: () => Promise<boolean>;
  onExport?: (nightId: string) => Promise<boolean>;
  onRestockCategory?: (categoryId: string) => Promise<boolean>;
  aiReports?: AiReport[];
  aiReportsLoading?: boolean;
  aiReportGenerating?: boolean;
  onGenerateAiReport?: (nightId: string) => Promise<boolean>;
  onDownloadAiReport?: (reportId: string) => Promise<boolean>;
  onStaffMode?: () => void;
  loading: boolean;
  barName?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const selectedNight = nights.find((n) => n.id === selectedNightId) ?? null;
  const showingCurrentNight = Boolean(selectedNight && selectedNight.id === currentNightId);
  const restockCategories = showingCurrentNight ? categories ?? [] : [];

  const byCategory = selectedNight
    ? selectedNight.usageByCategory.map((category) => ({
        label: category.name,
        count: category.bottlesUsed,
      }))
    : [];

  const alerts = selectedNight?.alerts ?? [];
  const hasAlerts = alerts.length > 0;
  const showFallback = !hasAlerts && (selectedNight?.alertsFlagged ?? 0) > 0;

  const alertsByCategory = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const cat = alert.categoryName ?? "General";
    const existing = alertsByCategory.get(cat) ?? [];
    existing.push(alert);
    alertsByCategory.set(cat, existing);
  }
  const groupedAlerts = Array.from(alertsByCategory.entries()).map(([categoryName, catAlerts]) => {
    const count = catAlerts.length;
    const latest = catAlerts.reduce((max, a) =>
      new Date(a.triggeredAt).getTime() > new Date(max.triggeredAt).getTime() ? a : max
    , catAlerts[0]);
    const hasCritical = catAlerts.some((a) => a.severity === "critical");
    const allResolved = catAlerts.every((a) => a.status === "resolved" || a.status === "dismissed");
    const allLowStock = catAlerts.every((a) => a.type === "low_stock");
    const allOverpour = catAlerts.every((a) => a.type === "overpour");

    let text = "";
    if (allLowStock) {
      text = hasCritical
        ? `Out of ${categoryName.toLowerCase()}`
        : `Low stock ${categoryName.toLowerCase()}`;
    } else if (allOverpour) {
      text = `Overpour flagged — ${categoryName}`;
    } else {
      text = `${count} alert${count > 1 ? "s" : ""} in ${categoryName}`;
    }

    if (allResolved) {
      text = `${text} · resolved`;
    }

    const triggeredTime = new Date(latest.triggeredAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const resolvedTime = latest.resolvedAt
      ? new Date(latest.resolvedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : null;

    return {
      key: categoryName,
      text,
      time: allResolved && resolvedTime ? `${triggeredTime} - ${resolvedTime}` : triggeredTime,
      type: allResolved ? ("resolved" as const) : hasCritical ? ("danger" as const) : ("warning" as const),
    };
  });

  const latestAiReport = aiReports[0] ?? null;
  const latestAiContent =
    latestAiReport?.status === "completed" && latestAiReport.reportJson
      ? (latestAiReport.reportJson as AiReportContent)
      : null;
  const savedAiReports = aiReports.filter((report) => report.status === "completed");

  const maxCount = byCategory.length > 0 ? Math.max(...byCategory.map((b) => b.count)) : 0;

  const handleRestock = async (categoryId: string) => {
    if (!onRestockCategory || restockingId) return;
    setRestockingId(categoryId);
    try {
      await onRestockCategory(categoryId);
    } finally {
      setRestockingId(null);
    }
  };

  return (
    <div style={styles.root}>
      {/* Top nav */}
      <div style={{ ...styles.nav, animation: "fadeInDown 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        <div style={styles.navLeft}>
          <button className="icon-animate" style={styles.sidebarToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={styles.logoWrap}>
            <Image src="/logo.png" alt="OnTap" width={28} height={28} style={styles.logoImg} />
            <span style={styles.logoText}>OnTap</span>
          </div>
          <span style={styles.navTitle}>{barName ? `${barName} — Manager Dashboard` : "Manager Dashboard"}</span>
        </div>
        <div style={styles.navRight}>
          <button className="btn-animate" style={styles.closeNightBtn} onClick={onCloseNight}>Close for the Night</button>
          <button className="btn-animate" style={styles.staffModeBtn} onClick={onStaffMode}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={styles.staffModeText}>Staff Mode</span>
          </button>
          <button className="btn-animate" style={styles.settingsBtn} onClick={onSettings}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span style={styles.settingsText}>Settings</span>
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {/* Sidebar */}
        {sidebarOpen && (
          <div style={{ ...styles.sidebar, animation: "slideInLeft 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
            <p style={styles.sidebarHeading}>Past Nights</p>
            {nights.map((night, index) => (
              <button
                key={night.id}
                className="list-item-animate"
                style={{
                  ...styles.sidebarItem,
                  ...(selectedNightId === night.id ? styles.sidebarItemActive : {}),
                  transition: "all 0.15s ease",
                  animation: `fadeInUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) ${0.05 + index * 0.03}s both`,
                }}
                onClick={() => onSelectNight(night.id)}
              >
                <p style={{ ...styles.sidebarDate, color: selectedNightId === night.id ? "#0d1f3c" : "#0d1f3c" }}>{night.date}</p>
                <p style={styles.sidebarSub}>{night.day} · {night.bottles} bottles</p>
              </button>
            ))}
          </div>
        )}

        {/* Main content */}
        <div style={styles.main}>
          {loading ? (
            <p style={{ ...styles.noAlerts, animation: "fadeIn 0.3s ease" }}>Loading nights...</p>
          ) : !selectedNight ? (
            <p style={styles.noAlerts}>No night selected.</p>
          ) : (
            <>
              {/* Night header */}
              <div style={{ ...styles.nightHeader, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
                <div>
                  <h1 style={styles.nightTitle}>{selectedNight.date}</h1>
                  <p style={styles.nightSub}>
                    {selectedNight.day === "Wed" ? "Wednesday" : selectedNight.day === "Fri" ? "Friday" : selectedNight.day === "Sat" ? "Saturday" : selectedNight.day} · shift 9PM – 2AM
                  </p>
                </div>
                <button className="btn-animate" style={styles.exportBtn} onClick={() => onExport?.(selectedNight.id)}>export</button>
              </div>

              {/* Stats */}
              <div style={{ ...styles.statsRow, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>
                <div style={styles.statBox}>
                  <p style={styles.statLabel}>bottles used</p>
                  <p className="stat-number" style={styles.statNum}>{selectedNight.bottlesUsed}</p>
                </div>
                <div style={styles.statBox}>
                  <p style={styles.statLabel}>alerts flagged</p>
                  <p className="stat-number" style={{ ...styles.statNum, color: selectedNight.alertsFlagged > 0 ? "#ef4444" : "#0d1f3c" }}>{selectedNight.alertsFlagged}</p>
                </div>
                <div style={styles.statBox}>
                  <p style={styles.statLabel}>bartenders on</p>
                  <p className="stat-number" style={styles.statNum}>{selectedNight.bartendersOn}</p>
                </div>
              </div>

              {/* AI Insights */}
              <div style={{ ...styles.section, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.12s both" }}>
                <div style={styles.sectionHeader}>
                  <div>
                    <p style={styles.sectionLabel}>AI insights</p>
                    <p style={styles.aiSubtext}>Actionable report generated from inventory, alerts, POS variance, and usage.</p>
                  </div>
                  <button
                    className="btn-animate"
                    style={{ ...styles.generateBtn, ...(aiReportGenerating ? styles.generateBtnDisabled : {}) }}
                    onClick={() => onGenerateAiReport?.(selectedNight.id)}
                    disabled={aiReportGenerating || aiReportsLoading}
                  >
                    {aiReportGenerating ? "generating..." : "Generate AI Report"}
                  </button>
                </div>

                {aiReportsLoading ? (
                  <p style={styles.noAlerts}>Loading saved AI reports...</p>
                ) : latestAiReport?.status === "failed" ? (
                  <div style={styles.aiErrorBox}>
                    <p style={styles.aiErrorTitle}>Latest AI report failed</p>
                    <p style={styles.aiErrorText}>{latestAiReport.errorMessage ?? "Try generating again."}</p>
                  </div>
                ) : latestAiContent ? (
                  <div style={styles.aiReportBox}>
                    <div style={styles.aiReportHeader}>
                      <div>
                        <p style={styles.aiReportTitle}>{latestAiReport.title}</p>
                        <p style={styles.reportMeta}>
                          Generated {new Date(latestAiReport.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                      <button className="btn-animate" style={styles.downloadReportBtn} onClick={() => onDownloadAiReport?.(latestAiReport.id)}>
                        download
                      </button>
                    </div>
                    <p style={styles.aiSummary}>{latestAiContent.executiveSummary}</p>
                    {latestAiContent.keyInsights.length > 0 && (
                      <div style={styles.aiColumnBlock}>
                        <p style={styles.aiMiniLabel}>key insights</p>
                        <div style={styles.aiList}>
                          {latestAiContent.keyInsights.slice(0, 4).map((insight) => (
                            <div key={insight} style={styles.aiListItem}>{insight}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {latestAiContent.actionItems.length > 0 && (
                      <div style={styles.aiColumnBlock}>
                        <p style={styles.aiMiniLabel}>next actions</p>
                        <div style={styles.aiList}>
                          {latestAiContent.actionItems.slice(0, 4).map((item) => (
                            <div key={`${item.priority}-${item.title}`} style={styles.actionRow}>
                              <span style={{ ...styles.priorityPill, ...(item.priority === "high" ? styles.priorityHigh : item.priority === "medium" ? styles.priorityMedium : styles.priorityLow) }}>
                                {item.priority}
                              </span>
                              <div>
                                <p style={styles.actionTitle}>{item.title}</p>
                                <p style={styles.actionDetail}>{item.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={styles.noAlerts}>No AI reports saved for this night yet.</p>
                )}

                {savedAiReports.length > 1 && (
                  <div style={styles.savedReportsList}>
                    {savedAiReports.slice(1, 4).map((report) => (
                      <div key={report.id} style={styles.savedReportRow}>
                        <span style={styles.savedReportTitle}>{report.title}</span>
                        <button style={styles.savedReportDownload} onClick={() => onDownloadAiReport?.(report.id)}>download</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {restockCategories.length > 0 && (
                <div style={{ ...styles.section, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both" }}>
                  <p style={styles.sectionLabel}>restock categories</p>
                  <div style={styles.restockList}>
                    {restockCategories.map((category) => {
                      const needsRestock = category.products.length > 0 && category.currentStock < category.parLevel;
                      return (
                        <div key={category.id} style={styles.restockRow}>
                          <div style={styles.restockMeta}>
                            <span style={styles.restockName}>{category.name}</span>
                            <span style={styles.restockStock}>stock {category.currentStock}/{category.parLevel}</span>
                          </div>
                          <span style={{ ...styles.restockStatus, ...(needsRestock ? styles.restockStatusLow : styles.restockStatusFull) }}>
                            {needsRestock ? "low" : "full"}
                          </span>
                          <button
                            className="btn-animate"
                            style={{ ...styles.restockBtn, ...(!needsRestock ? styles.restockBtnDisabled : {}) }}
                            onClick={() => handleRestock(category.id)}
                            disabled={!needsRestock || restockingId !== null}
                          >
                            {restockingId === category.id ? "restocking..." : "restock"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottles by category */}
              <div style={{ ...styles.section, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.2s both" }}>
                <p style={styles.sectionLabel}>bottles by category</p>
                <div style={styles.barList}>
                  {byCategory.length === 0 && (
                    <p style={styles.noAlerts}>No bottle counts for this night yet.</p>
                  )}
                  {byCategory.map((item, index) => (
                    <div key={item.label} style={{ ...styles.barRow, animation: `fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) ${0.25 + index * 0.05}s both` }}>
                      <span style={styles.barLabel}>{item.label}</span>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: maxCount > 0 ? `${(item.count / maxCount) * 100}%` : "0%", animation: `barGrow 0.6s cubic-bezier(0.25, 1, 0.5, 1) ${0.3 + index * 0.08}s both` }} />
                      </div>
                      <span style={styles.barCount}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts */}
              <div style={{ ...styles.section, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.3s both" }}>
                <p style={styles.sectionLabel}>alerts that night</p>
                <div style={styles.alertList}>
                  {groupedAlerts.length > 0 ? (
                    groupedAlerts.map((alert) => (
                      <div key={alert.key} style={{
                        ...styles.alertRow,
                        background: alert.type === "danger" ? "#fee2e2" : alert.type === "resolved" ? "#f3f4f6" : "#fef9c3",
                        border: `1px solid ${alert.type === "danger" ? "#ef4444" : alert.type === "resolved" ? "#d1d5db" : "#f59e0b"}`,
                      }}>
                        <span style={{ ...styles.alertDot, background: alert.type === "danger" ? "#ef4444" : alert.type === "resolved" ? "#9ca3af" : "#f59e0b" }} />
                        <span style={styles.alertText}>{alert.text}</span>
                        <span style={{ ...styles.alertTime, color: alert.type === "danger" ? "#ef4444" : alert.type === "resolved" ? "#6b7280" : "#f59e0b" }}>{alert.time}</span>
                      </div>
                    ))
                  ) : showFallback ? (
                    <div style={{
                      ...styles.alertRow,
                      background: "#fef9c3",
                      border: "1px solid #f59e0b",
                    }}>
                      <span style={{ ...styles.alertDot, background: "#f59e0b" }} />
                      <span style={styles.alertText}>{selectedNight.alertsFlagged} alerts flagged</span>
                      <span style={{ ...styles.alertTime, color: "#f59e0b" }}>11:00 PM</span>
                    </div>
                  ) : (
                    <p style={styles.noAlerts}>No alerts that night.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { width: "100vw", height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", background: "#f8f8f6", overflow: "hidden" },
  nav: { background: "#0d1f3c", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  navLeft: { display: "flex", alignItems: "center", gap: "16px" },
  navRight: { display: "flex", alignItems: "center", gap: "12px" },
  sidebarToggle: { background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" },
  logoWrap: { display: "flex", alignItems: "center", gap: "8px" },
  logoImg: { width: "28px", height: "28px", borderRadius: "6px", objectFit: "contain", background: "rgba(255,255,255,0.08)" },
  logoText: { fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: "600", color: "#ffffff" },
  navTitle: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#a8b8cc", borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "16px" },
  closeNightBtn: { fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "500", color: "#0d1f3c", background: "#ffffff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" },
  settingsBtn: { display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 14px", cursor: "pointer" },
  settingsText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ffffff" },
  staffModeBtn: { display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 14px", cursor: "pointer" },
  staffModeText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#ffffff" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: "220px", minWidth: "220px", background: "#f0ede8", borderRight: "1px solid #e5e7eb", overflowY: "auto", padding: "20px 0" },
  sidebarHeading: { fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "600", color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", padding: "0 20px 12px" },
  sidebarItem: { width: "100%", background: "transparent", border: "none", padding: "12px 20px", textAlign: "left", cursor: "pointer", borderLeft: "3px solid transparent" },
  sidebarItemActive: { background: "#ffffff", borderLeft: "3px solid #0d1f3c" },
  sidebarDate: { fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "500", margin: "0 0 2px", color: "#0d1f3c" },
  sidebarSub: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#9ca3af", margin: 0 },
  main: { flex: 1, overflowY: "auto", padding: "32px 40px" },
  nightHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" },
  nightTitle: { fontFamily: "'Inter', sans-serif", fontSize: "28px", fontWeight: "600", color: "#0d1f3c", margin: "0 0 4px", letterSpacing: "-0.02em" },
  nightSub: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6b7280", margin: 0 },
  exportBtn: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#0d1f3c", background: "transparent", border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 18px", cursor: "pointer" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", marginBottom: "28px", background: "#fff" },
  statBox: { padding: "20px 24px", borderRight: "1px solid #e5e7eb" },
  statLabel: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#6b7280", margin: "0 0 6px" },
  statNum: { fontFamily: "'Inter', sans-serif", fontSize: "36px", fontWeight: "600", color: "#0d1f3c", margin: 0, letterSpacing: "-0.02em" },
  section: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px 24px", marginBottom: "20px" },
  sectionLabel: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#6b7280", margin: "0 0 16px" },
  restockList: { display: "flex", flexDirection: "column", gap: "10px" },
  restockRow: { display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: "12px", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px 14px", background: "#fbfdff" },
  restockMeta: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
  restockName: { fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: "600", color: "#0d1f3c" },
  restockStock: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#6b7280" },
  restockStatus: { fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "999px", padding: "5px 9px" },
  restockStatusLow: { background: "#fef3c7", color: "#92400e" },
  restockStatusFull: { background: "#dcfce7", color: "#166534" },
  restockBtn: { fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "600", color: "#ffffff", background: "#0d1f3c", border: "none", borderRadius: "8px", padding: "8px 14px", cursor: "pointer" },
  restockBtnDisabled: { color: "#9ca3af", background: "#f3f4f6", cursor: "not-allowed" },
  barList: { display: "flex", flexDirection: "column", gap: "10px" },
  barRow: { display: "flex", alignItems: "center", gap: "12px" },
  barLabel: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#374151", width: "110px", flexShrink: 0 },
  barTrack: { flex: 1, height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" },
  barFill: { height: "100%", background: "#0d1f3c", borderRadius: "4px", transition: "width 0.4s ease" },
  barCount: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#0d1f3c", fontWeight: "500", width: "24px", textAlign: "right" },
  alertList: { display: "flex", flexDirection: "column", gap: "8px" },
  noAlerts: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#9ca3af", margin: 0 },
  alertRow: { display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "8px" },
  alertDot: { width: "8px", height: "8px", minWidth: "8px", borderRadius: "50%" },
  alertText: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#0d1f3c", flex: 1 },
  alertTime: { fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" },
  aiSubtext: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#9ca3af", margin: "-8px 0 0" },
  generateBtn: { fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "600", color: "#ffffff", background: "#0d1f3c", border: "none", borderRadius: "8px", padding: "9px 14px", cursor: "pointer", whiteSpace: "nowrap" },
  generateBtnDisabled: { opacity: 0.65, cursor: "wait" },
  aiReportBox: { border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" },
  aiReportHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" },
  aiReportTitle: { fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: "700", color: "#0d1f3c", margin: "0 0 4px" },
  reportMeta: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#6b7280", margin: 0 },
  downloadReportBtn: { fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: "600", color: "#0d1f3c", background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "8px 12px", cursor: "pointer" },
  aiSummary: { fontFamily: "'Inter', sans-serif", fontSize: "14px", lineHeight: 1.55, color: "#1f2937", margin: 0 },
  aiColumnBlock: { display: "flex", flexDirection: "column", gap: "8px" },
  aiMiniLabel: { fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 },
  aiList: { display: "flex", flexDirection: "column", gap: "8px" },
  aiListItem: { fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#374151", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" },
  actionRow: { display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px", alignItems: "start", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" },
  priorityPill: { fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", borderRadius: "999px", padding: "5px 8px" },
  priorityHigh: { background: "#fee2e2", color: "#991b1b" },
  priorityMedium: { background: "#fef3c7", color: "#92400e" },
  priorityLow: { background: "#dcfce7", color: "#166534" },
  actionTitle: { fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "700", color: "#0d1f3c", margin: "0 0 3px" },
  actionDetail: { fontFamily: "'Inter', sans-serif", fontSize: "12px", lineHeight: 1.45, color: "#4b5563", margin: 0 },
  aiErrorBox: { border: "1px solid #fecaca", background: "#fef2f2", borderRadius: "10px", padding: "14px 16px" },
  aiErrorTitle: { fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: "700", color: "#991b1b", margin: "0 0 4px" },
  aiErrorText: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#7f1d1d", margin: 0 },
  savedReportsList: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" },
  savedReportRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "9px 12px", background: "#ffffff" },
  savedReportTitle: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#374151", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  savedReportDownload: { fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#0d1f3c", background: "transparent", border: "none", cursor: "pointer", padding: 0 },
};
