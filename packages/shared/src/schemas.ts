import { z } from "zod";

export const idSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const barRoleSchema = z.enum(["owner", "manager", "staff"]);
export const accountStatusSchema = z.enum(["active", "inactive", "invited"]);
export const productUnitSchema = z.enum([
  "bottle",
  "case",
  "keg",
  "can",
  "each",
  "liter",
  "milliliter",
  "ounce",
  "pound",
  "gram",
]);
export const bottleDoneReasonSchema = z.enum(["sold", "comped", "waste", "breakage", "transfer"]);
export const posEstimatePeriodSchema = z.enum(["shift", "day", "week", "month"]);
export const inventoryCategoryTypeSchema = z.enum([
  "spirit",
  "liquor",
  "beer",
  "wine",
  "mixer",
  "keg",
  "food",
  "custom",
  "other",
]);
export const barSizeSchema = z.enum(["small", "medium", "large"]);
export const posEstimateSourceSchema = z.enum(["manual", "mock", "pos"]);

export const trimmedString = z.string().trim().min(1);
export const optionalNotesSchema = z.string().trim().max(1000).optional();
const quantitySchema = z.number().finite().positive();

export const categorySchema = z.object({
  id: idSchema,
  barId: idSchema,
  name: trimmedString.max(80),
  type: inventoryCategoryTypeSchema,
  displayOrder: z.number().int().nonnegative(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const upsertCategorySchema = categorySchema
  .pick({ name: true, type: true, displayOrder: true, color: true, isActive: true })
  .partial({ displayOrder: true, isActive: true });

export const productSchema = z.object({
  id: idSchema,
  barId: idSchema,
  categoryId: idSchema,
  name: trimmedString.max(120),
  unit: productUnitSchema,
  sizeMl: z.number().int().positive().optional(),
  parLevel: z.number().finite().nonnegative().optional(),
  costCents: z.number().int().nonnegative().optional(),
  posName: z.string().trim().max(120).optional(),
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const upsertProductSchema = productSchema
  .pick({
    categoryId: true,
    name: true,
    unit: true,
    sizeMl: true,
    parLevel: true,
    costCents: true,
    posName: true,
    isActive: true,
  })
  .partial({ isActive: true });

export const staffMemberSchema = z.object({
  id: idSchema,
  barId: idSchema,
  name: trimmedString.max(120),
  email: z.string().trim().email().optional(),
  role: barRoleSchema.exclude(["owner"]),
  status: accountStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const createStaffMemberSchema = staffMemberSchema
  .pick({ name: true, email: true, role: true })
  .extend({ pin: z.string().regex(/^\d{4,8}$/).optional() });

export const staffLoginSchema = z.object({
  barAccountId: idSchema.optional(),
  barSlug: trimmedString.max(80).optional(),
  staffMemberId: idSchema.optional(),
  name: trimmedString.max(120).optional(),
}).refine((value) => value.staffMemberId || value.name, {
  message: "staffMemberId or name is required",
});

export const managerLoginSchema = z.object({
  barAccountId: idSchema.optional(),
  barSlug: trimmedString.max(80).optional(),
  managerCode: z.string().regex(/^\d{4,8}$/),
  name: trimmedString.max(120).optional(),
});

export const onboardingCategorySchema = z.object({
  name: trimmedString.max(80),
  type: inventoryCategoryTypeSchema.default("other"),
  displayOrder: z.number().int().nonnegative().optional(),
  products: z.array(z.object({
    name: trimmedString.max(120),
    brand: z.string().trim().max(120).optional(),
    unit: productUnitSchema.default("bottle"),
    startingQuantity: z.number().finite().nonnegative().default(0),
    fullStockQuantity: z.number().finite().nonnegative().default(0),
  })).optional(),
});

export const onboardingSchema = z.object({
  barName: trimmedString.max(120),
  barSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,80}$/),
  ownerName: trimmedString.max(120),
  ownerEmail: z.string().trim().email(),
  location: z.string().trim().max(160).optional(),
  barSize: barSizeSchema,
  managerCode: z.string().regex(/^\d{4,8}$/),
  timezone: trimmedString.max(80),
  currency: z.string().trim().length(3),
  categories: z.array(onboardingCategorySchema).min(1).max(30),
});

export const barSettingsSchema = z.object({
  barId: idSchema,
  barName: trimmedString.max(120),
  timezone: trimmedString.max(80),
  currency: z.string().trim().length(3),
  lowStockThresholdPercent: z.number().int().min(0).max(100),
  requireBottleDoneNotes: z.boolean(),
  allowStaffPosEstimates: z.boolean(),
  updatedAt: isoDateTimeSchema,
});

export const updateBarSettingsSchema = barSettingsSchema
  .omit({ barId: true, updatedAt: true })
  .partial();

export const inventoryCountItemSchema = z.object({
  productId: idSchema,
  quantity: z.number().finite().nonnegative(),
  unit: productUnitSchema.optional(),
  notes: optionalNotesSchema,
});

export const inventoryCountSchema = z.object({
  id: idSchema,
  barId: idSchema,
  countedById: idSchema,
  countedAt: isoDateTimeSchema,
  items: z.array(inventoryCountItemSchema).min(1),
  notes: optionalNotesSchema,
});

export const createInventoryCountSchema = inventoryCountSchema.omit({ id: true, barId: true });

export const bottleDoneSchema = z.object({
  id: idSchema,
  barId: idSchema,
  productId: idSchema,
  completedById: idSchema,
  quantity: quantitySchema,
  reason: bottleDoneReasonSchema,
  completedAt: isoDateTimeSchema,
  notes: optionalNotesSchema,
});

export const createBottleDoneSchema = bottleDoneSchema.omit({ id: true, barId: true });

export const manualPosEstimateItemSchema = z.object({
  categoryId: idSchema.optional(),
  productId: idSchema.optional(),
  label: trimmedString.max(120),
  drinkCount: z.number().finite().nonnegative(),
  revenueCents: z.number().int().nonnegative().optional(),
  source: posEstimateSourceSchema.default("manual"),
});

export const manualPosEstimateSchema = z.object({
  id: idSchema,
  barId: idSchema,
  enteredById: idSchema,
  period: posEstimatePeriodSchema,
  periodStart: isoDateTimeSchema,
  periodEnd: isoDateTimeSchema,
  totalSalesCents: z.number().int().nonnegative().optional(),
  estimatedPourCostPercent: z.number().finite().min(0).max(100).optional(),
  items: z.array(manualPosEstimateItemSchema).min(1),
  notes: optionalNotesSchema,
});

export const createManualPosEstimateSchema = manualPosEstimateSchema.omit({ id: true, barId: true });

export const inventorySummarySchema = z.object({
  barId: idSchema,
  generatedAt: isoDateTimeSchema,
  categories: z.array(
    z.object({
      category: categorySchema,
      products: z.array(
        productSchema.extend({
          onHand: z.number().finite().nonnegative(),
          estimatedValueCents: z.number().int().nonnegative().optional(),
          isLowStock: z.boolean(),
        }),
      ),
    }),
  ),
});

export type Id = z.infer<typeof idSchema>;
export type BarRole = z.infer<typeof barRoleSchema>;
export type AccountStatus = z.infer<typeof accountStatusSchema>;
export type ProductUnit = z.infer<typeof productUnitSchema>;
export type BottleDoneReason = z.infer<typeof bottleDoneReasonSchema>;
export type PosEstimatePeriod = z.infer<typeof posEstimatePeriodSchema>;
export type InventoryCategoryType = z.infer<typeof inventoryCategoryTypeSchema>;
export type BarSize = z.infer<typeof barSizeSchema>;
export type PosEstimateSource = z.infer<typeof posEstimateSourceSchema>;
export type Category = z.infer<typeof categorySchema>;
export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>;
export type Product = z.infer<typeof productSchema>;
export type UpsertProductInput = z.infer<typeof upsertProductSchema>;
export type StaffMember = z.infer<typeof staffMemberSchema>;
export type CreateStaffMemberInput = z.infer<typeof createStaffMemberSchema>;
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;
export type ManagerLoginInput = z.infer<typeof managerLoginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type BarSettings = z.infer<typeof barSettingsSchema>;
export type UpdateBarSettingsInput = z.infer<typeof updateBarSettingsSchema>;
export type InventoryCountItem = z.infer<typeof inventoryCountItemSchema>;
export type InventoryCount = z.infer<typeof inventoryCountSchema>;
export type CreateInventoryCountInput = z.infer<typeof createInventoryCountSchema>;
export type BottleDone = z.infer<typeof bottleDoneSchema>;
export type CreateBottleDoneInput = z.infer<typeof createBottleDoneSchema>;
export type ManualPosEstimateItem = z.infer<typeof manualPosEstimateItemSchema>;
export type ManualPosEstimate = z.infer<typeof manualPosEstimateSchema>;
export type CreateManualPosEstimateInput = z.infer<typeof createManualPosEstimateSchema>;
export type InventorySummary = z.infer<typeof inventorySummarySchema>;

export const inventoryProductCreateSchema = z.object({
  name: trimmedString.max(120),
  brand: z.string().trim().max(120).optional(),
  categoryId: idSchema,
  supplierId: idSchema.optional(),
  sku: z.string().trim().max(120).optional(),
  sizeMl: z.number().int().positive().optional(),
  unitType: productUnitSchema,
  costPerUnit: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  parLevel: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
});

export const inventoryProductUpdateSchema = inventoryProductCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: idSchema,
  inventoryLocationId: idSchema,
  adjustmentType: z.enum(["manual_correction", "receiving", "transfer", "count_reconciliation", "damage", "return", "other"]),
  quantityDelta: z.number().finite(),
  reason: trimmedString.max(255),
  notes: optionalNotesSchema,
});

export const receiveStockSchema = z.object({
  mode: z.enum(["po", "free"]),
  purchaseOrderId: idSchema.optional(),
  lines: z.array(z.object({
    productId: idSchema,
    quantityReceived: z.number().positive(),
    unitCost: z.number().nonnegative().optional(),
  })).min(1),
  notes: optionalNotesSchema,
});

export type InventoryProductCreateInput = z.infer<typeof inventoryProductCreateSchema>;
export type InventoryProductUpdateInput = z.infer<typeof inventoryProductUpdateSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
