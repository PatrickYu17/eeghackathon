"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSession, AppView } from "../types";
import { actorToSession, getErrorMessage } from "../utils";
import {
  accountLogin,
  clearBarContextSession,
  getBarContext,
  getOnTapSession,
  registerBarAccount,
  managerLogin,
  staffLogin,
  logoutOnTap,
  getBartenderDashboard,
  getBossDashboard,
  getPreviousNights,
  getPreviousNight,
  getSettings,
  patchSettings,
  patchStaffSettings,
  closeNight,
  exportNight,
  recordBottleDone,
  restockInventoryCategory,
  undoBottleDone,
  clockOut,
  saveInventorySetup,
} from "../../../lib/on-tap-api";
import type {
  BarAccountSummary,
  BartenderDashboardResponse,
  BossDashboardResponse,
  ManagerNightSummary,
  OnTapCategory,
  StaffMemberSummary,
} from "../../../lib/on-tap-types";

export type SelectedItem = { id: string; label: string; qty: number };

const ROLE_SELECTION_PENDING_KEY = "onTapRoleSelectionPending";

function setRoleSelectionPending(pending: boolean) {
  if (typeof window === "undefined") return;
  if (pending) window.localStorage.setItem(ROLE_SELECTION_PENDING_KEY, "true");
  else window.localStorage.removeItem(ROLE_SELECTION_PENDING_KEY);
}

function isRoleSelectionPending() {
  return typeof window !== "undefined" && window.localStorage.getItem(ROLE_SELECTION_PENDING_KEY) === "true";
}

function clearBarContext() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ROLE_SELECTION_PENDING_KEY);
}

export function useOnTapApp() {
  /* ─── Navigation ─── */
  const [view, setView] = useState<AppView>("landing");

  /* ─── Session ─── */
  const [session, setSession] = useState<AppSession | null>(null);
  const [barAccount, setBarAccount] = useState<BarAccountSummary | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  /* ─── Onboarding ─── */
  const [onboardingCategories, setOnboardingCategories] = useState<string[]>(["spirits", "beer"]);
  const [onboardingItems, setOnboardingItems] = useState<Record<string, SelectedItem[]>>({});

  /* ─── Bartender ─── */
  const [bartenderData, setBartenderData] = useState<BartenderDashboardResponse | null>(null);
  const [bartenderLoading, setBartenderLoading] = useState(false);

  /* ─── Manager ─── */
  const [managerData, setManagerData] = useState<BossDashboardResponse | null>(null);
  const [previousNights, setPreviousNights] = useState<ManagerNightSummary[]>([]);
  const [selectedNightId, setSelectedNightId] = useState<string | null>(null);
  const [managerLoading, setManagerLoading] = useState(false);

  /* ─── Settings ─── */
  const [settingsData, setSettingsData] = useState<{
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
    staff: StaffMemberSummary[];
    categories: OnTapCategory[];
  } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  /* ─── Global error ─── */
  const [error, setError] = useState<string | null>(null);

  /* ─── Session restore on mount ─── */
  useEffect(() => {
    let active = true;

    setLoadingSession(true);
    (async () => {
      try {
        const res = await getOnTapSession();
        if (!active) return;

        if (res.authenticated && res.actor) {
          const s = actorToSession(res.actor);
          if (res.barAccount) setBarAccount(res.barAccount);
          if (s.type === "manager" && isRoleSelectionPending()) {
            setSession(null);
            setView("welcome");
          } else {
            setSession(s);
            setRoleSelectionPending(false);
            if (s.type === "staff") setView("bartender");
            else setView("manager");
          }
        } else {
          const context = await getBarContext();
          if (!active) return;

          if (context.authenticated && context.barAccount) {
            setBarAccount(context.barAccount);
            setView("welcome");
          } else {
            clearBarContext();
          }
        }
      } catch {
        /* no session = stay on landing */
      } finally {
        if (active) setLoadingSession(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /* ─── Auth ─── */
  const handleBarLogin = useCallback(async (input: { email: string; password: string }) => {
    setError(null);
    try {
      const res = await accountLogin(input);
      setSession(null);
      setBarAccount(res.barAccount);
      setRoleSelectionPending(true);
      setView("welcome");
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    }
  }, []);

  const handleCreateAccount = useCallback(
    async (input: {
      barName: string;
      email: string;
      password: string;
      managerCode: string;
    }) => {
      setError(null);
      try {
        const res = await registerBarAccount({
          ...input,
          staffNames: [],
        });
        if (res.actor) setSession(actorToSession(res.actor));
        if (res.barAccount) setBarAccount(res.barAccount);
        setRoleSelectionPending(false);
        setView("onboarding-cats");
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      }
    },
    []
  );

  const handleManagerLogin = useCallback(async (code: string) => {
    setError(null);
    try {
      const res = await managerLogin({
        managerCode: code,
      });
      if (res.actor) setSession(actorToSession(res.actor));
      if (res.barAccount) setBarAccount(res.barAccount);
      setRoleSelectionPending(false);
      setView("manager");
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    }
  }, []);

  const handleStaffLogin = useCallback(async (staffMemberId: string) => {
    setError(null);
    try {
      const res = await staffLogin({ staffMemberId });
      if (res.actor) setSession(actorToSession(res.actor));
      if (res.barAccount) setBarAccount(res.barAccount);
      setRoleSelectionPending(false);
      setView("bartender");
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutOnTap();
      await clearBarContextSession();
    } catch {
      /* ignore */
    }
    setSession(null);
    setBarAccount(null);
    clearBarContext();
    setBartenderData(null);
    setManagerData(null);
    setPreviousNights([]);
    setSettingsData(null);
    setView("landing");
  }, []);

  const handleClearBarContext = useCallback(async () => {
    try {
      await logoutOnTap();
      await clearBarContextSession();
    } catch {
      /* ignore */
    }
    setSession(null);
    setBarAccount(null);
    setBartenderData(null);
    setManagerData(null);
    setPreviousNights([]);
    setSettingsData(null);
    clearBarContext();
    setView("bar-login");
  }, []);

  /* ─── Onboarding ─── */
  const handleSaveOnboarding = useCallback(
    async (
      stockConfig: Record<string, SelectedItem[]>,
      staffNames: string[],
      categoryNames?: Record<string, string>
    ) => {
      setError(null);
      try {
        const categories = Object.keys(stockConfig)
          .map((catId) => {
            const items = stockConfig[catId];
            if (!items || items.length === 0) return null;
            const name =
              categoryNames?.[catId] ??
              catId.charAt(0).toUpperCase() + catId.slice(1);
            const type =
              catId === "mixers"
                ? "mixer"
                : catId === "spirits"
                ? "spirit"
                : catId.startsWith("custom-")
                ? "custom"
                : ["beer", "wine", "liquor", "keg", "food", "other"].includes(catId)
                ? catId
                : "other";
            return {
              name,
              type,
              products: items.map((item) => ({
                name: item.label,
                startingQuantity: item.qty,
                fullStockQuantity: item.qty,
              })),
            };
          })
          .filter(Boolean) as Array<{
            name: string;
            type: string;
            products: Array<{
              name: string;
              startingQuantity: number;
              fullStockQuantity: number;
            }>;
          }>;

        await saveInventorySetup({ categories });

        if (staffNames.length > 0) {
          await patchStaffSettings({ names: staffNames, deactivateIds: [] });
        }

        setView("manager");
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      }
    },
    []
  );

  /* ─── Bartender ─── */
  const loadBartenderDashboard = useCallback(async (showLoading = true) => {
    if (session?.type !== "staff") return;
    if (showLoading) setBartenderLoading(true);
    try {
      const data = await getBartenderDashboard();
      setBartenderData(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      if (showLoading) setBartenderLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (view === "bartender" && session?.type === "staff") {
      loadBartenderDashboard();
    }
  }, [view, session, loadBartenderDashboard]);

  const adjustBartenderBottleUsage = useCallback(
    (productId: string, categoryId: string | undefined, delta: number) => {
      setBartenderData((current) => {
        if (!current) return current;

        const category =
          current.categories.find((cat) => cat.id === categoryId) ??
          current.categories.find((cat) => cat.products.some((product) => product.id === productId));
        const resolvedCategoryId = categoryId ?? category?.id;
        if (!resolvedCategoryId) return current;

        const hasUsageRow = current.usageByCategory.some(
          (usage) => usage.categoryId === resolvedCategoryId
        );

        return {
          ...current,
          categories: current.categories.map((cat) =>
            cat.id === resolvedCategoryId
              ? {
                  ...cat,
                  currentStock: cat.currentStock - delta,
                  products: cat.products.map((product) =>
                    product.id === productId
                      ? { ...product, currentStock: product.currentStock - delta }
                      : product
                  ),
                }
              : cat
          ),
          usageByCategory: hasUsageRow
            ? current.usageByCategory.map((usage) =>
                usage.categoryId === resolvedCategoryId
                  ? { ...usage, bottlesUsed: Math.max(0, usage.bottlesUsed + delta) }
                  : usage
              )
            : [
                ...current.usageByCategory,
                {
                  categoryId: resolvedCategoryId,
                  name: category?.name ?? "Unknown",
                  bottlesUsed: Math.max(0, delta),
                },
              ],
        };
      });
    },
    []
  );

  const handleBottleDone = useCallback(
    async (productId: string, categoryId?: string) => {
      adjustBartenderBottleUsage(productId, categoryId, 1);
      try {
        await recordBottleDone({ productId, categoryId, quantityUsed: 1 });
        void loadBartenderDashboard(false);
        return true;
      } catch (e) {
        adjustBartenderBottleUsage(productId, categoryId, -1);
        setError(getErrorMessage(e));
        void loadBartenderDashboard(false);
        return false;
      }
    },
    [adjustBartenderBottleUsage, loadBartenderDashboard]
  );

  const handleUndoBottle = useCallback(
    async (usageLogId: string) => {
      try {
        await undoBottleDone(usageLogId);
        await loadBartenderDashboard(false);
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      }
    },
    [loadBartenderDashboard]
  );

  const handleClockOut = useCallback(async () => {
    try {
      await clockOut();
    } catch {
      /* ignore */
    }
    setSession(null);
    setBartenderData(null);
    setRoleSelectionPending(true);
    setView("welcome");
  }, []);

  /* ─── Manager ─── */
  const loadManagerData = useCallback(async (showLoading = true) => {
    if (session?.type === "staff") return;
    if (showLoading) setManagerLoading(true);
    try {
      const dash = await getBossDashboard();
      const nights = await getPreviousNights();
      setManagerData(dash);
      const nightIds = nights.nights.map((n) => n.id);
      setPreviousNights((prev) => {
        return nights.nights.map((n) => {
          const existing = prev.find((p) => p.id === n.id);
          const isCurrent = n.id === dash.barNight.id;
          return {
            ...n,
            date: new Date(n.closedAt || n.openedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" }),
            day: new Date(n.closedAt || n.openedAt).toLocaleDateString("en-US", { weekday: "short" }),
            bottles: isCurrent ? dash.stats.bottlesUsed : n.bottlesUsed || 0,
            bottlesUsed: isCurrent ? dash.stats.bottlesUsed : n.bottlesUsed || 0,
            alertsFlagged: isCurrent ? dash.stats.alertsFlagged : n.alertsFlagged ?? 0,
            bartendersOn: 0,
            usageByCategory: isCurrent ? dash.usageByCategory : n.usageByCategory,
            alerts: isCurrent ? dash.alerts : existing?.alerts,
          };
        });
      });
      setSelectedNightId((current) => {
        if (current && nightIds.includes(current)) return current;
        return nights.nights.find((n) => n.id === dash.barNight.id)?.id ?? nights.nights[0]?.id ?? null;
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      if (showLoading) setManagerLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (view === "manager" && session?.type !== "staff") {
      loadManagerData();
    }
  }, [view, session, loadManagerData]);

  useEffect(() => {
    if (view !== "manager" || session?.type === "staff") return;

    const intervalId = window.setInterval(() => {
      loadManagerData(false);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [view, session, loadManagerData]);

  useEffect(() => {
    if (!selectedNightId) return;
    let active = true;
    (async () => {
      try {
        const detail = await getPreviousNight(selectedNightId);
        if (!active) return;
        setPreviousNights((prev) =>
          prev.map((n) =>
            n.id === selectedNightId
              ? { ...n, alerts: detail.alerts, alertsFlagged: detail.alerts.length }
              : n
          )
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedNightId]);

  const handleCloseNight = useCallback(async () => {
    try {
      const res = await closeNight();
      await loadManagerData();
      return { success: true as const, nightId: res.night.id };
    } catch (e) {
      setError(getErrorMessage(e));
      return { success: false as const };
    }
  }, [loadManagerData]);

  const handleExportNight = useCallback(async (nightId: string) => {
    try {
      const { blob, contentDisposition } = await exportNight(nightId);
      const filename =
        contentDisposition?.match(/filename="?([^";]+)"?/)?.[1] ??
        `ontap-night-${nightId}.csv`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    }
  }, []);

  const handleRestockCategory = useCallback(
    async (categoryId: string) => {
      try {
        await restockInventoryCategory(categoryId);
        if (session?.type === "staff") {
          await loadBartenderDashboard(false);
        } else {
          await loadManagerData(false);
        }
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      }
    },
    [loadBartenderDashboard, loadManagerData, session]
  );

  /* ─── Settings ─── */
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await getSettings();
      setSettingsData(data as any);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "settings") {
      loadSettings();
    }
  }, [view, loadSettings]);

  const handleUpdateSettings = useCallback(
    async (input: Parameters<typeof patchSettings>[0]) => {
      try {
        await patchSettings(input);
        await loadSettings();
        return true;
      } catch (e) {
        setError(getErrorMessage(e));
        return false;
      }
    },
    [loadSettings]
  );

  /* ─── Derived ─── */
  const totalBottles = useMemo(() => {
    if (!bartenderData) return 0;
    return bartenderData.usageByCategory.reduce(
      (sum, cat) => sum + (cat.bottlesUsed || 0),
      0
    );
  }, [bartenderData]);

  return {
    /* Navigation */
    view,
    setView,

    /* Session */
    session,
    barAccount,
    loadingSession,

    /* Auth */
    handleBarLogin,
    handleCreateAccount,
    handleManagerLogin,
    handleStaffLogin,
    handleLogout,
    handleClearBarContext,

    /* Onboarding */
    onboardingCategories,
    setOnboardingCategories,
    onboardingItems,
    setOnboardingItems,
    handleSaveOnboarding,

    /* Bartender */
    bartenderData,
    bartenderLoading,
    totalBottles,
    handleBottleDone,
    handleUndoBottle,
    handleRestockCategory,
    handleClockOut,
    loadBartenderDashboard,

    /* Manager */
    managerData,
    previousNights,
    selectedNightId,
    setSelectedNightId,
    managerLoading,
    loadManagerData,
    handleCloseNight,
    handleExportNight,

    /* Settings */
    settingsData,
    settingsLoading,
    loadSettings,
    handleUpdateSettings,

    /* Global */
    error,
    setError,
  };
}
