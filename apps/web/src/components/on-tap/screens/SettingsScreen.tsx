"use client";

import { useState, useEffect, useCallback } from "react";
import type { OnTapCategory } from "../../../lib/on-tap-types";
import {
  patchStaffSettings,
  getInventoryCatalog,
  createInventoryProduct,
  updateInventoryProduct,
  toggleInventoryProduct,
  patchSettings,
} from "../../../lib/on-tap-api";

/* ─── Types ─── */

type SubView = "menu" | "staff" | "inventory" | "stock" | "alerts";

type StaffMember = {
  id: string;
  name: string;
  role: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
};

type CatalogCategory = {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  isActive: boolean;
};

type CatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string;
  unitType: string;
  parLevel: string | null;
  isActive: boolean;
};

/* ─── Component ─── */

export function SettingsScreen({
  onBack,
  onLogOut,
  barName,
  settingsData,
}: {
  onBack?: () => void;
  onLogOut?: () => void;
  barName?: string;
  settingsData?: {
    settings: {
      id: string;
      barAccountId: string;
      defaultInventoryLocationId: string | null;
      inventoryCountFrequency: string | null;
      lowStockAlertsEnabled: boolean;
      varianceAlertsEnabled: boolean;
      settingsJson: Record<string, unknown> | null;
      createdAt: string;
      updatedAt: string;
    } | null;
    staff: StaffMember[];
    categories: OnTapCategory[];
  } | null;
}) {
  const [subView, setSubView] = useState<SubView>("menu");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  /* ─── Shared state ─── */
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showMessage = (m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(null), 3000);
  };

  /* ─── Staff sub-view ─── */
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (settingsData?.staff) setStaffList(settingsData.staff);
  }, [settingsData]);

  const handleAddStaff = async () => {
    const trimmed = newStaffName.trim();
    if (!trimmed) return;
    setStaffLoading(true);
    try {
      await patchStaffSettings({ names: [trimmed] });
      setNewStaffName("");
      showMessage("Staff member added");
      // optimistic update
      setStaffList((prev) => [
        ...prev,
        { id: `temp-${Date.now()}`, name: trimmed, role: null, isActive: true, lastLoginAt: null },
      ]);
    } catch (e) {
      setError("Failed to add staff");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleDeactivateStaff = async (id: string) => {
    setStaffLoading(true);
    try {
      await patchStaffSettings({ deactivateIds: [id] });
      setStaffList((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: false } : s)));
      showMessage("Staff member deactivated");
    } catch (e) {
      setError("Failed to deactivate staff");
    } finally {
      setStaffLoading(false);
    }
  };

  /* ─── Inventory sub-view ─── */
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await getInventoryCatalog();
      setCatalogCategories(data.categories ?? []);
      setCatalogProducts(data.products ?? []);
      if (data.categories?.length && !newProductCategory) {
        setNewProductCategory(data.categories[0].id);
      }
    } catch (e) {
      setError("Failed to load inventory catalog");
    } finally {
      setCatalogLoading(false);
    }
  }, [newProductCategory]);

  const handleAddProduct = async () => {
    const trimmed = newProductName.trim();
    if (!trimmed || !newProductCategory) return;
    setCatalogLoading(true);
    try {
      await createInventoryProduct({
        name: trimmed,
        categoryId: newProductCategory,
        unitType: "bottle",
      });
      setNewProductName("");
      await loadCatalog();
      showMessage("Product added");
    } catch (e) {
      setError("Failed to add product");
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleToggleProduct = async (id: string, active: boolean) => {
    setCatalogLoading(true);
    try {
      await toggleInventoryProduct(id, active);
      setCatalogProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: active } : p))
      );
      showMessage(active ? "Product activated" : "Product deactivated");
    } catch (e) {
      setError("Failed to update product");
    } finally {
      setCatalogLoading(false);
    }
  };

  /* ─── Stock sub-view ─── */
  const [stockCategories, setStockCategories] = useState<OnTapCategory[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (settingsData?.categories) {
      setStockCategories(
        settingsData.categories.map((c) => ({
          ...c,
          products: c.products.map((p) => ({ ...p })),
        }))
      );
    }
  }, [settingsData, subView]);

  const updateStockParLevel = (categoryId: string, productId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setStockCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              products: cat.products.map((p) =>
                p.id === productId ? { ...p, parLevel: num } : p
              ),
            }
          : cat
      )
    );
  };

  const saveStockLevels = async () => {
    setStockLoading(true);
    try {
      for (const cat of stockCategories) {
        for (const prod of cat.products) {
          await updateInventoryProduct(prod.id, { parLevel: prod.parLevel });
        }
      }
      showMessage("Stock levels saved");
    } catch (e) {
      setError("Failed to save stock levels");
    } finally {
      setStockLoading(false);
    }
  };

  /* ─── Alerts sub-view ─── */
  const [lowStockAlerts, setLowStockAlerts] = useState(false);
  const [varianceAlerts, setVarianceAlerts] = useState(false);
  const [alertsSaving, setAlertsSaving] = useState(false);

  useEffect(() => {
    if (settingsData?.settings) {
      setLowStockAlerts(settingsData.settings.lowStockAlertsEnabled);
      setVarianceAlerts(settingsData.settings.varianceAlertsEnabled);
    }
  }, [settingsData]);

  const saveAlerts = async () => {
    setAlertsSaving(true);
    try {
      await patchSettings({
        lowStockAlertsEnabled: lowStockAlerts,
        varianceAlertsEnabled: varianceAlerts,
      });
      showMessage("Alert settings saved");
    } catch (e) {
      setError("Failed to save alert settings");
    } finally {
      setAlertsSaving(false);
    }
  };

  /* ─── Sub-view: Staff ─── */
  if (subView === "staff") {
    return (
      <SettingsLayout
        onBack={() => setSubView("menu")}
        title="Staff"
        barName={barName}
        footer={
          <div style={btnRowStyle}>
            <button className="btn-animate" style={backBtnStyle} onClick={() => setSubView("menu")}>
              Back
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          {staffList
            .filter((s) => s.isActive)
            .map((member, index) => (
              <div key={member.id} style={{ ...rowStyle, animation: `fadeInUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) ${index * 0.04}s both` }}>
                <div style={avatarStyle}>
                  <span style={avatarLetterStyle}>{member.name.charAt(0).toUpperCase()}</span>
                </div>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "#0d1f3c" }}>
                  {member.name}
                </span>
                <button
                  className="btn-animate"
                  style={ghostBtnStyle}
                  onClick={() => handleDeactivateStaff(member.id)}
                  disabled={staffLoading}
                >
                  Deactivate
                </button>
              </div>
            ))}

          <div style={{ ...rowStyle, borderStyle: "dashed", animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
            <div style={{ ...avatarStyle, border: "1px solid #d1d5db", background: "#fff" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <input
              style={inlineInputStyle}
              type="text"
              placeholder="Add new staff name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStaff()}
            />
            {newStaffName.trim() && (
              <button className="btn-animate" style={smallOutlineBtnStyle} onClick={handleAddStaff} disabled={staffLoading}>
                Add
              </button>
            )}
          </div>
        </div>

        {message && <p style={{ ...successStyle, animation: "fadeInUp 0.3s ease" }}>{message}</p>}
        {error && <p style={{ ...errorStyle, animation: "shake 0.4s ease" }}>{error}</p>}
      </SettingsLayout>
    );
  }

  /* ─── Sub-view: Inventory ─── */
  if (subView === "inventory") {
    return (
      <SettingsLayout
        onBack={() => setSubView("menu")}
        title="Inventory"
        barName={barName}
        footer={
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-animate" style={backBtnStyle} onClick={() => setSubView("menu")}>
              Back
            </button>
            <button
              className="btn-animate"
              style={primaryBtnStyle}
              onClick={() => {
                setError(null);
                loadCatalog();
              }}
            >
              Refresh Catalog
            </button>
          </div>
        }
      >
        {catalogLoading && !catalogCategories.length ? (
          <p style={{ color: "#9ca3af", fontSize: "13px", animation: "fadeIn 0.3s ease" }}>Loading catalog…</p>
        ) : (
          <>
            {catalogCategories.map((cat, catIndex) => (
              <div key={cat.id} style={{ marginBottom: "20px", animation: `fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) ${catIndex * 0.05}s both` }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1f3c", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
                  {cat.name} <span style={{ fontWeight: 400, color: "#9ca3af" }}>({cat.type})</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {catalogProducts
                    .filter((p) => p.categoryId === cat.id)
                    .map((product, prodIndex) => (
                      <div key={product.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: product.isActive ? "#f9fafb" : "#fff", border: "1px solid #e5e7eb", animation: `fadeInUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) ${0.05 + prodIndex * 0.03}s both` }}>
                        <button
                          style={{
                            ...checkStyle,
                            ...(product.isActive ? checkActiveStyle : {}),
                            transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                          }}
                          onClick={() => handleToggleProduct(product.id, !product.isActive)}
                        >
                          {product.isActive && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" style={{ animation: "checkPop 0.25s cubic-bezier(0.25, 1, 0.5, 1)" }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                        <span style={{ flex: 1, fontSize: "13px", color: product.isActive ? "#0d1f3c" : "#9ca3af", transition: "color 0.15s ease" }}>
                          {product.name}
                          {product.brand ? ` · ${product.brand}` : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            <div style={{ ...rowStyle, borderStyle: "dashed", marginTop: "8px", animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
              <select
                style={{ ...inlineInputStyle, maxWidth: "140px", paddingRight: "8px", flex: "0 0 auto" }}
                value={newProductCategory}
                onChange={(e) => setNewProductCategory(e.target.value)}
              >
                {catalogCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                style={inlineInputStyle}
                type="text"
                placeholder="New product name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddProduct()}
              />
              {newProductName.trim() && (
                <button className="btn-animate" style={smallOutlineBtnStyle} onClick={handleAddProduct} disabled={catalogLoading}>
                  Add
                </button>
              )}
            </div>
          </>
        )}

        {message && <p style={{ ...successStyle, marginTop: "12px", animation: "fadeInUp 0.3s ease" }}>{message}</p>}
        {error && <p style={{ ...errorStyle, marginTop: "12px", animation: "shake 0.4s ease" }}>{error}</p>}
      </SettingsLayout>
    );
  }

  /* ─── Sub-view: Stock ─── */
  if (subView === "stock") {
    return (
      <SettingsLayout
        onBack={() => setSubView("menu")}
        title="Default Full Stock"
        barName={barName}
        footer={
          <div style={btnRowStyle}>
            <button className="btn-animate" style={backBtnStyle} onClick={() => setSubView("menu")}>
              Back
            </button>
            <button className="btn-animate" style={primaryBtnStyle} onClick={saveStockLevels} disabled={stockLoading}>
              Save Stock Levels
            </button>
          </div>
        }
      >
        <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px", animation: "fadeIn 0.3s ease" }}>
          Edit par levels to set your default full-stock target for each product.
        </p>

        {stockCategories.map((cat, catIndex) => (
          <div key={cat.id} style={{ marginBottom: "20px", animation: `fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) ${catIndex * 0.05}s both` }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1f3c", margin: "0 0 10px" }}>
              {cat.name}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {cat.products.map((product, prodIndex) => (
                <div key={product.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", animation: `fadeInUp 0.3s cubic-bezier(0.25, 1, 0.5, 1) ${0.05 + prodIndex * 0.03}s both` }}>
                  <span style={{ fontSize: "13px", color: "#374151" }}>{product.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div className="input-animate" style={qtyWrapStyle}>
                      <input
                        style={qtyInputStyle}
                        type="number"
                        min="0"
                        value={product.parLevel}
                        onChange={(e) => updateStockParLevel(cat.id, product.id, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {message && <p style={{ ...successStyle, animation: "fadeInUp 0.3s ease" }}>{message}</p>}
        {error && <p style={{ ...errorStyle, animation: "shake 0.4s ease" }}>{error}</p>}
      </SettingsLayout>
    );
  }

  /* ─── Sub-view: Alerts ─── */
  if (subView === "alerts") {
    return (
      <SettingsLayout
        onBack={() => setSubView("menu")}
        title="Alerts"
        barName={barName}
        footer={
          <div style={btnRowStyle}>
            <button className="btn-animate" style={backBtnStyle} onClick={() => setSubView("menu")}>
              Back
            </button>
            <button className="btn-animate" style={primaryBtnStyle} onClick={saveAlerts} disabled={alertsSaving}>
              Save Alerts
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <label style={{ ...toggleRowStyle, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.05s both" }} htmlFor="lowStock">
            <input
              id="lowStock"
              type="checkbox"
              checked={lowStockAlerts}
              onChange={(e) => setLowStockAlerts(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "#0d1f3c", cursor: "pointer" }}
            />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#0d1f3c", margin: 0 }}>Low stock alerts</p>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Get notified when products drop below reorder point.</p>
            </div>
          </label>
          <label style={{ ...toggleRowStyle, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }} htmlFor="variance">
            <input
              id="variance"
              type="checkbox"
              checked={varianceAlerts}
              onChange={(e) => setVarianceAlerts(e.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: "#0d1f3c", cursor: "pointer" }}
            />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#0d1f3c", margin: 0 }}>Variance alerts</p>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: "2px 0 0" }}>Get notified when POS estimates differ significantly from logged usage.</p>
            </div>
          </label>
        </div>

        {message && <p style={{ ...successStyle, animation: "fadeInUp 0.3s ease" }}>{message}</p>}
        {error && <p style={{ ...errorStyle, animation: "shake 0.4s ease" }}>{error}</p>}
      </SettingsLayout>
    );
  }

  /* ─── Main Menu ─── */
  const menuItems = [
    {
      id: "staff",
      label: "Change Staff",
      sub: "Add, remove or deactivate bartenders",
      onClick: () => setSubView("staff"),
      icon: staffIcon,
    },
    {
      id: "inventory",
      label: "Change Liquor",
      sub: "Toggle products and add new items",
      onClick: () => {
        loadCatalog();
        setSubView("inventory");
      },
      icon: liquorIcon,
    },
    {
      id: "stock",
      label: "Change Default Full Stock",
      sub: "Edit par levels for each product",
      onClick: () => setSubView("stock"),
      icon: stockIcon,
    },
    {
      id: "alerts",
      label: "Alerts",
      sub: "Manage low-stock and variance alerts",
      onClick: () => setSubView("alerts"),
      icon: alertIcon,
    },
  ];

  return (
    <div style={styles.root}>
      {/* Wave */}
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6" />
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4" />
        </svg>
      </div>

      {/* Card */}
      <div style={{ ...styles.card, animation: "fadeInScale 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        {/* Back */}
        <button className="icon-animate" style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span style={styles.backText}>back</span>
        </button>

        {/* Header */}
        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.08s both" }}>Settings</h1>
        <p style={{ ...styles.subheading, animation: "fadeInUp 0.45s cubic-bezier(0.25, 1, 0.5, 1) 0.14s both" }}>{barName}</p>

        {/* Options list */}
        <div className="stagger-children" style={styles.list}>
          {menuItems.map((item, i) => (
            <button
              key={item.id}
              className="list-item-animate"
              style={{
                ...styles.listItem,
                borderBottom: i < menuItems.length - 1 ? "1px solid #f3f4f6" : "none",
                background: hoveredItem === item.id ? "#f9fafb" : "#ffffff",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={item.onClick}
            >
              <span style={{ ...styles.itemIcon, transition: "transform 0.2s ease", transform: hoveredItem === item.id ? "scale(1.1)" : "scale(1)" }}>{item.icon}</span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={styles.itemLabel}>{item.label}</span>
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>{item.sub}</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s ease", transform: hoveredItem === item.id ? "translateX(3px)" : "translateX(0)" }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}

          {/* Log out */}
          <button
            className="list-item-animate"
            style={{
              ...styles.listItem,
              borderTop: "1px solid #f3f4f6",
              background: hoveredItem === "logout" ? "#fff5f5" : "#ffffff",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={() => setHoveredItem("logout")}
            onMouseLeave={() => setHoveredItem(null)}
            onClick={onLogOut}
          >
            <span style={{ ...styles.itemIcon, transition: "transform 0.2s ease", transform: hoveredItem === "logout" ? "scale(1.1)" : "scale(1)" }}>{logoutIcon}</span>
            <span style={{ ...styles.itemLabel, color: "#ef4444" }}>Log Out</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" style={{ transition: "transform 0.2s ease", transform: hoveredItem === "logout" ? "translateX(3px)" : "translateX(0)" }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Layout wrapper for sub-views ─── */

function SettingsLayout({
  children,
  onBack,
  title,
  barName,
  footer,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title: string;
  barName?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div style={styles.root}>
      <div style={styles.waveContainer}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={styles.waveSvg} xmlns="http://www.w3.org/2000/svg">
          <path className="wave-animate" d="M0 700 C240 630 480 780 720 700 C960 620 1200 760 1440 690 L1440 900 L0 900 Z" fill="#071628" opacity="0.6" />
          <path className="wave-animate-slow" d="M0 760 C200 700 440 830 680 760 C920 690 1160 810 1440 745 L1440 900 L0 900 Z" fill="#071628" opacity="0.4" />
        </svg>
      </div>

      <div style={{ ...styles.card, maxWidth: "640px", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "fadeInScale 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards" }}>
        <button className="icon-animate" style={styles.back} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          <span style={styles.backText}>back</span>
        </button>

        <h1 style={{ ...styles.heading, animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.05s both" }}>{title}</h1>
        <p style={{ ...styles.subheading, marginBottom: "24px", animation: "fadeInUp 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.1s both" }}>{barName}</p>

        <div className="settings-scroll" style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "6px" }}>
          {children}
        </div>

        {footer && (
          <div style={{ paddingTop: "16px", flexShrink: 0, animation: "fadeInUp 0.35s cubic-bezier(0.25, 1, 0.5, 1) 0.2s both" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Icons ─── */

const staffIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const liquorIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 3H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l4.58-4.58c.94-.94.94-2.48 0-3.42L8 3z" />
    <circle cx="6" cy="6" r="1" fill="#0d1f3c" stroke="none" />
  </svg>
);

const stockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const alertIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d1f3c" strokeWidth="1.5" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const logoutIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ─── Shared styles ─── */

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px 16px",
  background: "#fff",
};

const avatarStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  minWidth: "32px",
  borderRadius: "50%",
  background: "#0d1f3c",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const avatarLetterStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  fontWeight: 600,
  color: "#ffffff",
};

const inlineInputStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: "#111827",
  border: "none",
  outline: "none",
  flex: 1,
  background: "transparent",
};

const smallOutlineBtnStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  fontWeight: 500,
  color: "#0d1f3c",
  background: "transparent",
  border: "1px solid #0d1f3c",
  borderRadius: "6px",
  padding: "6px 14px",
  cursor: "pointer",
};

const ghostBtnStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  fontWeight: 500,
  color: "#ef4444",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: "4px 8px",
};

const backBtnStyle: React.CSSProperties = {
  flex: "0 0 auto",
  padding: "12px 24px",
  background: "transparent",
  color: "#0d1f3c",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: "'Inter', sans-serif",
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  background: "#0d1f3c",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  fontSize: "15px",
  fontWeight: 600,
  fontFamily: "'Inter', sans-serif",
  cursor: "pointer",
  letterSpacing: "-0.01em",
};

const btnRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "4px",
};

const errorStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "#ef4444",
  margin: "0 0 12px",
};

const successStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  color: "#10b981",
  margin: "0 0 12px",
};

const checkStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  minWidth: "18px",
  border: "1.5px solid #d1d5db",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#fff",
  cursor: "pointer",
};

const checkActiveStyle: React.CSSProperties = {
  background: "#0d1f3c",
  borderColor: "#0d1f3c",
};

const qtyWrapStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "4px 10px",
  minWidth: "52px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const qtyInputStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "13px",
  fontWeight: 500,
  color: "#0d1f3c",
  border: "none",
  outline: "none",
  width: "40px",
  textAlign: "center",
  background: "transparent",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  cursor: "pointer",
};

/* ─── Layout styles ─── */

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
    padding: "32px 36px",
    width: "100%",
    maxWidth: "480px",
    margin: "20px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0 0 20px",
  },
  backText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "#6b7280",
  },
  heading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "26px",
    fontWeight: "600",
    color: "#0d1f3c",
    margin: "0 0 4px",
    letterSpacing: "-0.02em",
  },
  subheading: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 28px",
  },
  list: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },
  listItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 18px",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.12s ease",
  },
  itemIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    flexShrink: 0,
  },
  itemLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    color: "#0d1f3c",
  },
};
