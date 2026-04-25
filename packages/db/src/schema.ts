import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const barAccountStatusEnum = pgEnum("bar_account_status", [
  "active",
  "suspended",
  "deleted",
]);

export const managerRoleEnum = pgEnum("manager_role", [
  "manager",
  "admin_manager",
]);

export const productCategoryEnum = pgEnum("product_category", [
  "liquor",
  "beer",
  "wine",
  "mixer",
  "food",
  "other",
]);

export const inventoryUnitTypeEnum = pgEnum("inventory_unit_type", [
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

export const inventoryCountStatusEnum = pgEnum("inventory_count_status", [
  "draft",
  "submitted",
  "approved",
  "rejected",
]);

export const usageReasonEnum = pgEnum("usage_reason", [
  "pour",
  "event",
  "comp",
  "recipe",
  "manual_entry",
  "other",
]);

export const wasteReasonEnum = pgEnum("waste_reason", [
  "spill",
  "breakage",
  "expired",
  "overpour",
  "comped",
  "other",
]);

export const stockAdjustmentTypeEnum = pgEnum("stock_adjustment_type", [
  "manual_correction",
  "receiving",
  "transfer",
  "count_reconciliation",
  "damage",
  "return",
  "other",
]);

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "submitted",
  "partially_received",
  "received",
  "cancelled",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "bar_account",
  "manager",
  "staff",
  "system",
]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const barAccounts = pgTable(
  "bar_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    slug: text("slug"),
    contactEmail: text("contact_email"),
    timezone: text("timezone").notNull().default("UTC"),
    currency: text("currency").notNull().default("USD"),
    status: barAccountStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    ownerUserIdIdx: index("bar_accounts_owner_user_id_idx").on(
      table.ownerUserId
    ),
    slugIdx: uniqueIndex("bar_accounts_slug_idx").on(table.slug),
  })
);

export const managers = pgTable(
  "managers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    accessCodeHash: text("access_code_hash").notNull(),
    role: managerRoleEnum("role").notNull().default("manager"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("managers_bar_account_id_idx").on(
      table.barAccountId
    ),
    activeIdx: index("managers_bar_account_active_idx").on(
      table.barAccountId,
      table.isActive
    ),
    userIdIdx: index("managers_user_id_idx").on(table.userId),
  })
);

export const staffMembers = pgTable(
  "staff_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    role: text("role"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("staff_members_bar_account_id_idx").on(
      table.barAccountId
    ),
    activeIdx: index("staff_members_bar_account_active_idx").on(
      table.barAccountId,
      table.isActive
    ),
    userIdIdx: index("staff_members_user_id_idx").on(table.userId),
  })
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("suppliers_bar_account_id_idx").on(
      table.barAccountId
    ),
    nameIdx: index("suppliers_bar_account_name_idx").on(
      table.barAccountId,
      table.name
    ),
  })
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    brand: text("brand"),
    category: productCategoryEnum("category").notNull().default("other"),
    sku: text("sku"),
    barcode: text("barcode"),
    sizeMl: integer("size_ml"),
    unitType: inventoryUnitTypeEnum("unit_type").notNull().default("each"),
    costPerUnit: numeric("cost_per_unit", { precision: 12, scale: 2 }),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
    parLevel: numeric("par_level", { precision: 12, scale: 3 }),
    reorderPoint: numeric("reorder_point", { precision: 12, scale: 3 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("products_bar_account_id_idx").on(
      table.barAccountId
    ),
    nameIdx: index("products_bar_account_name_idx").on(
      table.barAccountId,
      table.name
    ),
    categoryIdx: index("products_bar_account_category_idx").on(
      table.barAccountId,
      table.category
    ),
    supplierIdIdx: index("products_supplier_id_idx").on(table.supplierId),
  })
);

export const inventoryLocations = pgTable(
  "inventory_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("inventory_locations_bar_account_id_idx").on(
      table.barAccountId
    ),
    nameIdx: uniqueIndex("inventory_locations_bar_account_name_idx").on(
      table.barAccountId,
      table.name
    ),
  })
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    inventoryLocationId: uuid("inventory_location_id")
      .notNull()
      .references(() => inventoryLocations.id),
    quantityOnHand: numeric("quantity_on_hand", {
      precision: 12,
      scale: 3,
    })
      .notNull()
      .default("0"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("inventory_items_bar_account_id_idx").on(
      table.barAccountId
    ),
    productLocationIdx: uniqueIndex(
      "inventory_items_product_location_idx"
    ).on(table.productId, table.inventoryLocationId),
    productIdx: index("inventory_items_product_id_idx").on(table.productId),
    locationIdx: index("inventory_items_inventory_location_id_idx").on(
      table.inventoryLocationId
    ),
  })
);

export const inventoryCounts = pgTable(
  "inventory_counts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    status: inventoryCountStatusEnum("status").notNull().default("draft"),
    startedByManagerId: uuid("started_by_manager_id").references(
      () => managers.id,
      { onDelete: "set null" }
    ),
    assignedToStaffId: uuid("assigned_to_staff_id").references(
      () => staffMembers.id,
      { onDelete: "set null" }
    ),
    submittedByStaffId: uuid("submitted_by_staff_id").references(
      () => staffMembers.id,
      { onDelete: "set null" }
    ),
    approvedByManagerId: uuid("approved_by_manager_id").references(
      () => managers.id,
      { onDelete: "set null" }
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("inventory_counts_bar_account_id_idx").on(
      table.barAccountId
    ),
    statusIdx: index("inventory_counts_bar_account_status_idx").on(
      table.barAccountId,
      table.status
    ),
    submittedAtIdx: index("inventory_counts_bar_account_submitted_at_idx").on(
      table.barAccountId,
      table.submittedAt
    ),
  })
);

export const inventoryCountLines = pgTable(
  "inventory_count_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inventoryCountId: uuid("inventory_count_id")
      .notNull()
      .references(() => inventoryCounts.id, { onDelete: "cascade" }),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    inventoryLocationId: uuid("inventory_location_id")
      .notNull()
      .references(() => inventoryLocations.id),
    countedQuantity: numeric("counted_quantity", {
      precision: 12,
      scale: 3,
    }).notNull(),
    expectedQuantity: numeric("expected_quantity", { precision: 12, scale: 3 }),
    varianceQuantity: numeric("variance_quantity", { precision: 12, scale: 3 }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    inventoryCountIdIdx: index("inventory_count_lines_count_id_idx").on(
      table.inventoryCountId
    ),
    barAccountIdIdx: index("inventory_count_lines_bar_account_id_idx").on(
      table.barAccountId
    ),
    productLocationIdx: uniqueIndex(
      "inventory_count_lines_count_product_location_idx"
    ).on(table.inventoryCountId, table.productId, table.inventoryLocationId),
  })
);

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    inventoryLocationId: uuid("inventory_location_id").references(
      () => inventoryLocations.id,
      { onDelete: "set null" }
    ),
    staffMemberId: uuid("staff_member_id").references(() => staffMembers.id, {
      onDelete: "set null",
    }),
    managerId: uuid("manager_id").references(() => managers.id, {
      onDelete: "set null",
    }),
    quantityUsed: numeric("quantity_used", { precision: 12, scale: 3 }).notNull(),
    reason: usageReasonEnum("reason").notNull().default("manual_entry"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (table) => ({
    barAccountIdIdx: index("usage_logs_bar_account_id_idx").on(
      table.barAccountId
    ),
    occurredAtIdx: index("usage_logs_bar_account_occurred_at_idx").on(
      table.barAccountId,
      table.occurredAt
    ),
    productIdx: index("usage_logs_product_id_idx").on(table.productId),
    staffMemberIdx: index("usage_logs_staff_member_id_idx").on(
      table.staffMemberId
    ),
  })
);

export const wasteLogs = pgTable(
  "waste_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    inventoryLocationId: uuid("inventory_location_id").references(
      () => inventoryLocations.id,
      { onDelete: "set null" }
    ),
    staffMemberId: uuid("staff_member_id").references(() => staffMembers.id, {
      onDelete: "set null",
    }),
    managerId: uuid("manager_id").references(() => managers.id, {
      onDelete: "set null",
    }),
    quantityWasted: numeric("quantity_wasted", {
      precision: 12,
      scale: 3,
    }).notNull(),
    reason: wasteReasonEnum("reason").notNull().default("other"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (table) => ({
    barAccountIdIdx: index("waste_logs_bar_account_id_idx").on(
      table.barAccountId
    ),
    occurredAtIdx: index("waste_logs_bar_account_occurred_at_idx").on(
      table.barAccountId,
      table.occurredAt
    ),
    productIdx: index("waste_logs_product_id_idx").on(table.productId),
    staffMemberIdx: index("waste_logs_staff_member_id_idx").on(
      table.staffMemberId
    ),
  })
);

export const stockAdjustments = pgTable(
  "stock_adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    inventoryLocationId: uuid("inventory_location_id")
      .notNull()
      .references(() => inventoryLocations.id),
    managerId: uuid("manager_id").references(() => managers.id, {
      onDelete: "set null",
    }),
    adjustmentType: stockAdjustmentTypeEnum("adjustment_type")
      .notNull()
      .default("manual_correction"),
    quantityDelta: numeric("quantity_delta", {
      precision: 12,
      scale: 3,
    }).notNull(),
    reason: text("reason").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (table) => ({
    barAccountIdIdx: index("stock_adjustments_bar_account_id_idx").on(
      table.barAccountId
    ),
    productIdx: index("stock_adjustments_product_id_idx").on(table.productId),
    locationIdx: index("stock_adjustments_inventory_location_id_idx").on(
      table.inventoryLocationId
    ),
  })
);

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    createdByManagerId: uuid("created_by_manager_id").references(
      () => managers.id,
      { onDelete: "set null" }
    ),
    orderNumber: text("order_number"),
    status: purchaseOrderStatusEnum("status").notNull().default("draft"),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    totalCost: numeric("total_cost", { precision: 12, scale: 2 }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: index("purchase_orders_bar_account_id_idx").on(
      table.barAccountId
    ),
    statusIdx: index("purchase_orders_bar_account_status_idx").on(
      table.barAccountId,
      table.status
    ),
    supplierIdx: index("purchase_orders_supplier_id_idx").on(table.supplierId),
  })
);

export const purchaseOrderLines = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantityOrdered: numeric("quantity_ordered", {
      precision: 12,
      scale: 3,
    }).notNull(),
    quantityReceived: numeric("quantity_received", {
      precision: 12,
      scale: 3,
    }).default("0"),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    purchaseOrderIdIdx: index("purchase_order_lines_purchase_order_id_idx").on(
      table.purchaseOrderId
    ),
    barAccountIdIdx: index("purchase_order_lines_bar_account_id_idx").on(
      table.barAccountId
    ),
    productIdx: index("purchase_order_lines_product_id_idx").on(table.productId),
  })
);

export const barAccountSettings = pgTable(
  "bar_account_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    defaultInventoryLocationId: uuid("default_inventory_location_id").references(
      () => inventoryLocations.id,
      { onDelete: "set null" }
    ),
    inventoryCountFrequency: text("inventory_count_frequency"),
    lowStockAlertsEnabled: boolean("low_stock_alerts_enabled")
      .notNull()
      .default(true),
    varianceAlertsEnabled: boolean("variance_alerts_enabled")
      .notNull()
      .default(true),
    settingsJson: jsonb("settings_json").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    barAccountIdIdx: uniqueIndex("bar_account_settings_bar_account_id_idx").on(
      table.barAccountId
    ),
    defaultInventoryLocationIdIdx: index(
      "bar_account_settings_default_inventory_location_id_idx"
    ).on(table.defaultInventoryLocationId),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barAccountId: uuid("bar_account_id")
      .notNull()
      .references(() => barAccounts.id, { onDelete: "cascade" }),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (table) => ({
    barAccountIdIdx: index("audit_logs_bar_account_id_idx").on(
      table.barAccountId
    ),
    createdAtIdx: index("audit_logs_bar_account_created_at_idx").on(
      table.barAccountId,
      table.createdAt
    ),
    entityIdx: index("audit_logs_entity_idx").on(
      table.entityType,
      table.entityId
    ),
  })
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  authAccounts: many(account),
  ownedBarAccounts: many(barAccounts),
  managerProfiles: many(managers),
  staffProfiles: many(staffMembers),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const barAccountRelations = relations(barAccounts, ({ one, many }) => ({
  ownerUser: one(user, {
    fields: [barAccounts.ownerUserId],
    references: [user.id],
  }),
  managers: many(managers),
  staffMembers: many(staffMembers),
  suppliers: many(suppliers),
  products: many(products),
  inventoryLocations: many(inventoryLocations),
  inventoryItems: many(inventoryItems),
  inventoryCounts: many(inventoryCounts),
  usageLogs: many(usageLogs),
  wasteLogs: many(wasteLogs),
  stockAdjustments: many(stockAdjustments),
  purchaseOrders: many(purchaseOrders),
  purchaseOrderLines: many(purchaseOrderLines),
  settings: one(barAccountSettings),
  auditLogs: many(auditLogs),
}));

export const managerRelations = relations(managers, ({ one }) => ({
  barAccount: one(barAccounts, {
    fields: [managers.barAccountId],
    references: [barAccounts.id],
  }),
  user: one(user, {
    fields: [managers.userId],
    references: [user.id],
  }),
}));

export const staffMemberRelations = relations(staffMembers, ({ one }) => ({
  barAccount: one(barAccounts, {
    fields: [staffMembers.barAccountId],
    references: [barAccounts.id],
  }),
  user: one(user, {
    fields: [staffMembers.userId],
    references: [user.id],
  }),
}));

export const supplierRelations = relations(suppliers, ({ one, many }) => ({
  barAccount: one(barAccounts, {
    fields: [suppliers.barAccountId],
    references: [barAccounts.id],
  }),
  products: many(products),
  purchaseOrders: many(purchaseOrders),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  barAccount: one(barAccounts, {
    fields: [products.barAccountId],
    references: [barAccounts.id],
  }),
  supplier: one(suppliers, {
    fields: [products.supplierId],
    references: [suppliers.id],
  }),
  inventoryItems: many(inventoryItems),
  inventoryCountLines: many(inventoryCountLines),
  usageLogs: many(usageLogs),
  wasteLogs: many(wasteLogs),
  stockAdjustments: many(stockAdjustments),
  purchaseOrderLines: many(purchaseOrderLines),
}));

export const inventoryLocationRelations = relations(
  inventoryLocations,
  ({ one, many }) => ({
    barAccount: one(barAccounts, {
      fields: [inventoryLocations.barAccountId],
      references: [barAccounts.id],
    }),
    inventoryItems: many(inventoryItems),
    inventoryCountLines: many(inventoryCountLines),
    usageLogs: many(usageLogs),
    wasteLogs: many(wasteLogs),
    stockAdjustments: many(stockAdjustments),
  })
);

export const inventoryItemRelations = relations(inventoryItems, ({ one }) => ({
  barAccount: one(barAccounts, {
    fields: [inventoryItems.barAccountId],
    references: [barAccounts.id],
  }),
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
  inventoryLocation: one(inventoryLocations, {
    fields: [inventoryItems.inventoryLocationId],
    references: [inventoryLocations.id],
  }),
}));

export const inventoryCountRelations = relations(
  inventoryCounts,
  ({ one, many }) => ({
    barAccount: one(barAccounts, {
      fields: [inventoryCounts.barAccountId],
      references: [barAccounts.id],
    }),
    startedByManager: one(managers, {
      fields: [inventoryCounts.startedByManagerId],
      references: [managers.id],
    }),
    assignedToStaff: one(staffMembers, {
      fields: [inventoryCounts.assignedToStaffId],
      references: [staffMembers.id],
    }),
    submittedByStaff: one(staffMembers, {
      fields: [inventoryCounts.submittedByStaffId],
      references: [staffMembers.id],
    }),
    approvedByManager: one(managers, {
      fields: [inventoryCounts.approvedByManagerId],
      references: [managers.id],
    }),
    lines: many(inventoryCountLines),
  })
);

export const inventoryCountLineRelations = relations(
  inventoryCountLines,
  ({ one }) => ({
    inventoryCount: one(inventoryCounts, {
      fields: [inventoryCountLines.inventoryCountId],
      references: [inventoryCounts.id],
    }),
    barAccount: one(barAccounts, {
      fields: [inventoryCountLines.barAccountId],
      references: [barAccounts.id],
    }),
    product: one(products, {
      fields: [inventoryCountLines.productId],
      references: [products.id],
    }),
    inventoryLocation: one(inventoryLocations, {
      fields: [inventoryCountLines.inventoryLocationId],
      references: [inventoryLocations.id],
    }),
  })
);

export const usageLogRelations = relations(usageLogs, ({ one }) => ({
  barAccount: one(barAccounts, {
    fields: [usageLogs.barAccountId],
    references: [barAccounts.id],
  }),
  product: one(products, {
    fields: [usageLogs.productId],
    references: [products.id],
  }),
  inventoryLocation: one(inventoryLocations, {
    fields: [usageLogs.inventoryLocationId],
    references: [inventoryLocations.id],
  }),
  staffMember: one(staffMembers, {
    fields: [usageLogs.staffMemberId],
    references: [staffMembers.id],
  }),
  manager: one(managers, {
    fields: [usageLogs.managerId],
    references: [managers.id],
  }),
}));

export const wasteLogRelations = relations(wasteLogs, ({ one }) => ({
  barAccount: one(barAccounts, {
    fields: [wasteLogs.barAccountId],
    references: [barAccounts.id],
  }),
  product: one(products, {
    fields: [wasteLogs.productId],
    references: [products.id],
  }),
  inventoryLocation: one(inventoryLocations, {
    fields: [wasteLogs.inventoryLocationId],
    references: [inventoryLocations.id],
  }),
  staffMember: one(staffMembers, {
    fields: [wasteLogs.staffMemberId],
    references: [staffMembers.id],
  }),
  manager: one(managers, {
    fields: [wasteLogs.managerId],
    references: [managers.id],
  }),
}));

export const stockAdjustmentRelations = relations(
  stockAdjustments,
  ({ one }) => ({
    barAccount: one(barAccounts, {
      fields: [stockAdjustments.barAccountId],
      references: [barAccounts.id],
    }),
    product: one(products, {
      fields: [stockAdjustments.productId],
      references: [products.id],
    }),
    inventoryLocation: one(inventoryLocations, {
      fields: [stockAdjustments.inventoryLocationId],
      references: [inventoryLocations.id],
    }),
    manager: one(managers, {
      fields: [stockAdjustments.managerId],
      references: [managers.id],
    }),
  })
);

export const purchaseOrderRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    barAccount: one(barAccounts, {
      fields: [purchaseOrders.barAccountId],
      references: [barAccounts.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    createdByManager: one(managers, {
      fields: [purchaseOrders.createdByManagerId],
      references: [managers.id],
    }),
    lines: many(purchaseOrderLines),
  })
);

export const purchaseOrderLineRelations = relations(
  purchaseOrderLines,
  ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
      fields: [purchaseOrderLines.purchaseOrderId],
      references: [purchaseOrders.id],
    }),
    barAccount: one(barAccounts, {
      fields: [purchaseOrderLines.barAccountId],
      references: [barAccounts.id],
    }),
    product: one(products, {
      fields: [purchaseOrderLines.productId],
      references: [products.id],
    }),
  })
);

export const barAccountSettingRelations = relations(
  barAccountSettings,
  ({ one }) => ({
    barAccount: one(barAccounts, {
      fields: [barAccountSettings.barAccountId],
      references: [barAccounts.id],
    }),
    defaultInventoryLocation: one(inventoryLocations, {
      fields: [barAccountSettings.defaultInventoryLocationId],
      references: [inventoryLocations.id],
    }),
  })
);

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
  barAccount: one(barAccounts, {
    fields: [auditLogs.barAccountId],
    references: [barAccounts.id],
  }),
}));

export type BarAccount = typeof barAccounts.$inferSelect;
export type NewBarAccount = typeof barAccounts.$inferInsert;

export type Manager = typeof managers.$inferSelect;
export type NewManager = typeof managers.$inferInsert;

export type StaffMember = typeof staffMembers.$inferSelect;
export type NewStaffMember = typeof staffMembers.$inferInsert;

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type InventoryLocation = typeof inventoryLocations.$inferSelect;
export type NewInventoryLocation = typeof inventoryLocations.$inferInsert;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type NewInventoryCount = typeof inventoryCounts.$inferInsert;

export type InventoryCountLine = typeof inventoryCountLines.$inferSelect;
export type NewInventoryCountLine = typeof inventoryCountLines.$inferInsert;

export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;

export type WasteLog = typeof wasteLogs.$inferSelect;
export type NewWasteLog = typeof wasteLogs.$inferInsert;

export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustments.$inferInsert;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderLine = typeof purchaseOrderLines.$inferSelect;
export type NewPurchaseOrderLine = typeof purchaseOrderLines.$inferInsert;

export type BarAccountSettings = typeof barAccountSettings.$inferSelect;
export type NewBarAccountSettings = typeof barAccountSettings.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
