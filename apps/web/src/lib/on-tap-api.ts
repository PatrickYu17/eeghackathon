import { api, apiBlob } from "./api";
import type {
  BarAccountSummary,
  BartenderDashboardResponse,
  BossDashboardResponse,
  InventoryCatalogResponse,
  InventoryCategory,
  InventoryHistoryResponse,
  InventoryProduct,
  OnTapActor,
  PreviousNightDetailResponse,
  PreviousNightsResponse,
  PurchaseOrderSummary,
  RecentUsageResponse,
  StaffMemberSummary,
} from "./on-tap-types";

type AuthResponse = {
  actor: OnTapActor;
  barAccount: BarAccountSummary;
  staff?: StaffMemberSummary[];
  expiresInSeconds: number;
};

type BarContextResponse = {
  authenticated: boolean;
  barContext?: { barAccountId: string };
  barAccount?: BarAccountSummary;
};

type BarLoginResponse = {
  barContext: { barAccountId: string };
  barAccount: BarAccountSummary;
  staff?: Array<{ id: string; name: string }>;
  expiresInSeconds: number;
};

type StaffLoginResponse = AuthResponse & {
  barNight?: { id: string; businessDate: string };
};

export function getOnTapSession() {
  return api<{
    authenticated: boolean;
    actor?: OnTapActor;
    barAccount?: BarAccountSummary;
  }>("/api/on-tap/session", { credentials: "include" });
}

export function getBarContext() {
  return api<BarContextResponse>("/api/on-tap/bar-context", {
    credentials: "include",
  });
}

export function clearBarContextSession() {
  return api<{ ok: true }>("/api/on-tap/bar-context/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function checkBarEmail(email: string) {
  return api<{ exists: boolean }>("/api/on-tap/account/check-email", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify({ email }),
  });
}

export function registerBarAccount(input: {
  barName: string;
  email: string;
  password: string;
  managerName?: string;
  managerCode: string;
  staffNames: string[];
  barSize?: string;
}) {
  return api<AuthResponse>("/api/on-tap/account/register", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function accountLogin(input: { email: string; password: string }) {
  return api<BarLoginResponse>("/api/on-tap/account/login", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function managerLogin(input: {
  barAccountId?: string;
  barSlug?: string;
  managerCode: string;
  name?: string;
}) {
  return api<AuthResponse>("/api/on-tap/login/manager", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function staffLogin(input: {
  staffMemberId?: string;
}) {
  return api<StaffLoginResponse>("/api/on-tap/login/staff", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function getStaffRoster() {
  return api<{ staff: StaffMemberSummary[] }>("/api/on-tap/staff", {
    credentials: "include",
  });
}

export function getCurrentBarStaffRoster() {
  return api<{ staff: Array<{ id: string; name: string }> }>("/api/on-tap/staff-roster/current", {
    credentials: "include",
  });
}

export function getBartenderDashboard() {
  return api<BartenderDashboardResponse>("/api/on-tap/bartender/dashboard", {
    credentials: "include",
  });
}

export function getRecentUsage() {
  return api<RecentUsageResponse>("/api/on-tap/bartender/recent-usage", {
    credentials: "include",
  });
}

export function getPreviousNights() {
  return api<PreviousNightsResponse>("/api/on-tap/boss/previous-nights", {
    credentials: "include",
  });
}

export function getPreviousNight(nightId: string) {
  return api<PreviousNightDetailResponse>(`/api/on-tap/boss/previous-nights/${encodeURIComponent(nightId)}`, {
    credentials: "include",
  });
}

export function recordBottleDone(input: {
  productId: string;
  categoryId?: string;
  inventoryLocationId?: string;
  quantityUsed?: number;
  notes?: string;
}) {
  return api<{ ok: true; usageLogId: string }>("/api/on-tap/bartender/bottle-done", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function undoBottleDone(usageLogId: string) {
  return api<{ ok: true; usageLogId: string }>(`/api/on-tap/bartender/bottle-done/${usageLogId}/undo`, {
    method: "POST",
    credentials: "include",
  });
}

export function clockOut() {
  return api<{ ok: true }>("/api/on-tap/bartender/clock-out", {
    method: "POST",
    credentials: "include",
  });
}

export function getBossDashboard() {
  return api<BossDashboardResponse>("/api/on-tap/boss/dashboard", {
    credentials: "include",
  });
}

export function closeNight() {
  return api<{ success: true; night: { id: string } }>("/api/on-tap/boss/close-night", {
    method: "POST",
    credentials: "include",
  });
}

export function exportNight(nightId: string) {
  return apiBlob(`/api/on-tap/boss/export/${encodeURIComponent(nightId)}`, {
    credentials: "include",
  });
}

export function saveInventorySetup(input: {
  categories: Array<{
    id?: string;
    name: string;
    type?: string;
    sortOrder?: number;
    products: Array<{
      id?: string;
      name: string;
      brand?: string;
      unitType?: string;
      startingQuantity: number;
      fullStockQuantity: number;
      reorderPoint?: number;
    }>;
  }>;
}) {
  return api<{ ok: true }>("/api/on-tap/onboarding/categories", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function saveManualPosEstimate(input: {
  categoryId?: string;
  productId?: string;
  drinkCount: number;
  source?: "manual" | "mock" | "pos";
  grossSales?: number;
  notes?: string;
}) {
  return api("/api/on-tap/boss/pos-estimates", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function logoutOnTap() {
  return api<{ ok: true }>("/api/on-tap/logout", {
    method: "POST",
    credentials: "include",
  });
}

export function getSettings() {
  return api<{
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
    staff: Array<{
      id: string;
      name: string;
      role: string | null;
      isActive: boolean;
      lastLoginAt: string | null;
    }>;
    categories: import("./on-tap-types").OnTapCategory[];
  }>("/api/on-tap/settings", { credentials: "include" });
}

export function patchSettings(input: {
  lowStockAlertsEnabled?: boolean;
  varianceAlertsEnabled?: boolean;
  settingsJson?: Record<string, unknown>;
}) {
  return api<{ settings: { id: string } }>("/api/on-tap/settings", {
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function patchStaffSettings(input: {
  names?: string[];
  deactivateIds?: string[];
}) {
  return api<{ ok: true }>("/api/on-tap/settings/staff", {
    method: "PATCH",
    credentials: "include",
    body: JSON.stringify(input),
  });
}

export function getInventoryCatalog() {
  return api<InventoryCatalogResponse>("/api/on-tap/inventory/catalog", { credentials: "include" });
}

export function createInventoryCategory(input: { name: string; type: string; sortOrder?: number }) {
  return api<{ category: InventoryCategory }>("/api/on-tap/inventory/categories", { method: "POST", credentials: "include", body: JSON.stringify(input) });
}

export function updateInventoryCategory(id: string, input: Partial<{ name: string; type: string; sortOrder: number; isActive: boolean }>) {
  return api<{ category: InventoryCategory }>(`/api/on-tap/inventory/categories/${id}`, { method: "PATCH", credentials: "include", body: JSON.stringify(input) });
}

export function deleteInventoryCategory(id: string) {
  return api<{ ok: true }>(`/api/on-tap/inventory/categories/${id}`, { method: "DELETE", credentials: "include" });
}

export function restockInventoryCategory(id: string) {
  return api<{ ok: true; categoryId: string; productsRestocked: number; quantityAdded: number }>(`/api/on-tap/inventory/categories/${id}/restock`, { method: "POST", credentials: "include" });
}

export function createInventoryProduct(input: {
  name: string;
  brand?: string;
  categoryId: string;
  supplierId?: string;
  sku?: string;
  sizeMl?: number;
  unitType: string;
  costPerUnit?: number;
  sellingPrice?: number;
  parLevel?: number;
  reorderPoint?: number;
}) {
  return api<{ product: InventoryProduct }>("/api/on-tap/inventory/products", { method: "POST", credentials: "include", body: JSON.stringify(input) });
}

export function updateInventoryProduct(id: string, input: Partial<{
  name: string;
  brand?: string;
  categoryId: string;
  supplierId?: string;
  sku?: string;
  sizeMl?: number;
  unitType: string;
  costPerUnit?: number;
  sellingPrice?: number;
  parLevel?: number;
  reorderPoint?: number;
  isActive?: boolean;
}>) {
  return api<{ product: InventoryProduct }>(`/api/on-tap/inventory/products/${id}`, { method: "PATCH", credentials: "include", body: JSON.stringify(input) });
}

export function toggleInventoryProduct(id: string, isActive: boolean) {
  return api<{ product: InventoryProduct }>(`/api/on-tap/inventory/products/${id}/toggle`, { method: "POST", credentials: "include", body: JSON.stringify({ isActive }) });
}

export function adjustStock(input: {
  productId: string;
  inventoryLocationId: string;
  adjustmentType: string;
  quantityDelta: number;
  reason: string;
  notes?: string;
}) {
  return api<{ adjustment: { id: string }; item: { quantityOnHand: string } }>("/api/on-tap/inventory/adjust", { method: "POST", credentials: "include", body: JSON.stringify(input) });
}

export function getPurchaseOrders() {
  return api<{ orders: PurchaseOrderSummary[] }>("/api/on-tap/inventory/purchase-orders", { credentials: "include" });
}

export function receiveStock(input: {
  mode: "po" | "free";
  purchaseOrderId?: string;
  lines: Array<{ productId: string; quantityReceived: number; unitCost?: number }>;
  notes?: string;
}) {
  return api<{ ok: true }>("/api/on-tap/inventory/receive", { method: "POST", credentials: "include", body: JSON.stringify(input) });
}

export function getInventoryHistory(type?: string, limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  if (limit) params.append("limit", String(limit));
  if (offset) params.append("offset", String(offset));
  return api<InventoryHistoryResponse>(`/api/on-tap/inventory/history?${params.toString()}`, { credentials: "include" });
}

export function getReportSummary(barNightId?: string) {
  const qs = barNightId ? `?barNightId=${barNightId}` : "";
  return api<import("./on-tap-types").ReportSummaryResponse>(`/api/on-tap/boss/report-summary${qs}`, { credentials: "include" });
}

export function getReportVariance(barNightId?: string) {
  const qs = barNightId ? `?barNightId=${barNightId}` : "";
  return api<import("./on-tap-types").ReportVarianceResponse>(`/api/on-tap/boss/report-variance${qs}`, { credentials: "include" });
}

export function getReportReorders(barNightId?: string) {
  const qs = barNightId ? `?barNightId=${barNightId}` : "";
  return api<import("./on-tap-types").ReportReorderResponse>(`/api/on-tap/boss/report-reorders${qs}`, { credentials: "include" });
}

export function getNightRecommendations(nightId: string) {
  return api<import("./on-tap-types").NightRecommendationsResponse>(`/api/on-tap/boss/night-recommendations/${encodeURIComponent(nightId)}`, {
    credentials: "include",
  });
}

export function generateMockPos() {
  return api<{ estimates: unknown[]; totalDrinks: number; totalSales: number }>("/api/on-tap/pos/generate-mock", {
    method: "POST",
    credentials: "include",
  });
}
