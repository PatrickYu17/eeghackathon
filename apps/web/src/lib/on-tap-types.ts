export type OnTapRole = "manager" | "staff";

export type OnTapActor = {
  type: OnTapRole;
  actorId: string;
  barAccountId: string;
  name: string;
  role?: string | null;
  staffShiftId?: string;
};

export type BarAccountSummary = {
  id: string;
  name: string;
  slug: string | null;
  timezone: string;
  currency: string;
  onboardingCompletedAt: string | null;
  barSize: string | null;
  location: string | null;
};

export type StaffMemberSummary = {
  id: string;
  name: string;
  role: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
};

export type OnTapCategory = {
  id: string;
  name: string;
  type: string;
  currentStock: number;
  parLevel: number;
  products: Array<{
    id: string;
    name: string;
    brand: string | null;
    unitType: string;
    currentStock: number;
    parLevel: number;
    reorderPoint: number;
    inventoryLocationId: string | null;
  }>;
};

export type OnTapAlert = {
  id: string;
  type: "low_stock" | "overpour" | "keg_check" | "reorder" | string;
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  title: string;
  message: string | null;
  triggeredAt: string;
  resolvedAt?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
};

export type BartenderDashboardResponse = {
  barNight: { id: string; businessDate: string };
  categories: OnTapCategory[];
  usageByCategory: Array<{
    categoryId: string;
    name: string;
    bottlesUsed: number;
  }>;
  alerts: OnTapAlert[];
};

export type BossDashboardResponse = {
  barNight: { id: string; businessDate: string };
  categories: OnTapCategory[];
  stats: {
    bottlesUsed: number;
    kegsUsed: number;
    alertsFlagged: number;
    reorderRecommendations: number;
    variancePct: number | null;
  };
  usageByCategory: Array<{
    categoryId: string;
    name: string;
    bottlesUsed: number;
  }>;
  alerts: OnTapAlert[];
  reorderRecommendations: Array<{
    categoryId: string;
    categoryName: string;
    productId: string;
    productName: string;
    currentStock: number;
    fullStock: number;
    recommendedQuantity: number;
    trend: "increase" | "decrease" | "maintain";
  }>;
};

export type RecentUsageResponse = {
  usageLogs: Array<{
    id: string;
    productId: string;
    categoryId: string | null;
    quantityUsed: string;
    occurredAt: string;
    reversedAt: string | null;
    productName: string | null;
    categoryName: string | null;
  }>;
};

export type PreviousNightsResponse = {
  nights: Array<{
    id: string;
    barAccountId: string;
    businessDate: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
    notes: string | null;
    bottlesUsed: number;
    grossSales: number;
    alertsFlagged: number;
    usageByCategory: Array<{
      categoryId: string;
      name: string;
      bottlesUsed: number;
    }>;
  }>;
};

export type PreviousNightDetailResponse = {
  night: {
    id: string;
    businessDate: string;
    status: string;
    openedAt: string;
    closedAt: string | null;
  };
  usage: unknown[];
  shifts: unknown[];
  alerts: OnTapAlert[];
};

export type ManagerNightSummary = PreviousNightsResponse["nights"][number] & {
  date: string;
  day: string;
  bottles: number;
  alertsFlagged: number;
  bartendersOn: number;
  alerts?: OnTapAlert[];
};

export type InventorySubView =
  | "menu"
  | "catalog"
  | "adjust"
  | "receive"
  | "import"
  | "history";

export type SupplierSummary = {
  id: string;
  name: string;
};

export type InventoryProduct = {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string;
  supplierId: string | null;
  sku: string | null;
  sizeMl: number | null;
  unitType: string;
  costPerUnit: string | null;
  sellingPrice: string | null;
  parLevel: string | null;
  reorderPoint: string | null;
  isActive: boolean;
};

export type InventoryItem = {
  id: string;
  productId: string;
  inventoryLocationId: string;
  quantityOnHand: string;
};

export type InventoryCatalogResponse = {
  categories: Array<{
    id: string;
    name: string;
    type: string;
    sortOrder: number;
    isActive: boolean;
  }>;
  products: InventoryProduct[];
  inventoryItems: InventoryItem[];
  suppliers: SupplierSummary[];
};

export type InventoryCategory = {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  isActive: boolean;
};

export type ReportSummaryResponse = {
  barNight: { id: string; businessDate: string; status: string };
  summary: {
    totalStartingStock: number;
    totalEndingStock: number;
    totalConsumed: number;
    totalAlerts: number;
  };
  spiritLines: Array<{
    productId: string;
    productName: string;
    categoryName: string;
    startingStock: number;
    consumed: number;
    endingStock: number;
    unitType: string;
    alertCount: number;
  }>;
};

export type ReportVarianceResponse = {
  discrepancies: Array<{
    categoryId: string;
    categoryName: string;
    bottlesLogged: number;
    posDrinkCount: number;
    ratio: number;
    discrepancyBottles: number;
    severity: "high" | "low" | "missing_pos";
    staffOnDuty: string[];
  }>;
};

export type ReportReorderResponse = {
  reorderLines: Array<{
    productId: string;
    productName: string;
    brand: string | null;
    categoryName: string;
    currentStock: number;
    parLevel: number;
    gap: number;
    avg14DayUsage: number;
    trend: "increase" | "decrease" | "maintain";
    recommendedQuantity: number;
    unitCost: number | null;
    supplierName: string | null;
  }>;
};

export type NightRecommendation = {
  categoryId: string;
  categoryName: string;
  totalUsed: number;
  fullStock: number;
  pctUsed: number;
  status: "over_ordered" | "balanced" | "ran_low";
  message: string;
};

export type NightRecommendationsResponse = {
  recommendations: NightRecommendation[];
  note: string;
};

export type PurchaseOrderSummary = {
  id: string;
  orderNumber: string | null;
  status: string;
  supplierName: string | null;
  totalCost: string | null;
  orderedAt: string | null;
};

export type StockAdjustmentSummary = {
  id: string;
  productId: string;
  adjustmentType: string;
  quantityDelta: string;
  reason: string;
  notes: string | null;
  createdAt: string;
  productName: string;
};

export type InventoryHistoryResponse = {
  adjustments: StockAdjustmentSummary[];
};
