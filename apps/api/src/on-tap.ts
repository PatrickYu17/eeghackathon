import { db } from "@repo/db";
import {
  account as authAccounts,
  aiReports,
  alerts,
  appSessions,
  auditLogs,
  barAccounts,
  barAccountSettings,
  barNights,
  inventoryCategories,
  inventoryCountLines,
  inventoryItems,
  inventoryLocations,
  managers,
  posEstimates,
  products,
  purchaseOrderLines,
  purchaseOrders,
  staffMembers,
  staffShifts,
  stockAdjustments,
  suppliers,
  usageLogs,
  user as authUsers,
} from "@repo/db";
import { and, desc, eq, gt, gte, inArray, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
  inventoryCategoryTypeSchema,
  inventoryProductCreateSchema,
  inventoryProductUpdateSchema,
  receiveStockSchema,
  stockAdjustmentSchema,
  trimmedString,
} from "@repo/shared";

type ActorType = "manager" | "staff";

type ActorSession = {
  type: ActorType;
  appSessionId: string;
  actorId: string;
  barAccountId: string;
  name: string;
  role?: string | null;
  staffShiftId?: string;
};

const app = new Hono();
const cookieName = "on_tap_session";
const barContextCookieName = "on_tap_bar_context";
const sessionTtlSeconds = 60 * 60 * 24;
const isProduction = process.env.NODE_ENV === "production";
const cookieSameSite = isProduction ? "None" : "Lax";

const uuidSchema = z.string().uuid();
const barLookupSchema = z.object({
  barAccountId: uuidSchema.optional(),
  barSlug: z.string().trim().min(1).optional(),
});

const accountAuthPasswordSchema = z.string().min(8).max(128);

const accountRegisterSchema = z.object({
  barName: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: accountAuthPasswordSchema,
  managerName: z.string().trim().min(1).optional(),
  managerCode: z.string().trim().regex(/^\d{4,8}$/),
  staffNames: z.array(z.string().trim().min(1)).max(100).default([]),
  location: z.string().trim().optional(),
  timezone: z.string().trim().min(1).optional(),
  currency: z.string().trim().length(3).optional(),
  barSize: z.enum(["small", "medium", "large"]).optional(),
});

const accountLoginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

const managerLoginSchema = barLookupSchema
  .extend({
    name: z.string().trim().min(1).optional(),
    accessCode: z.string().trim().regex(/^\d{4,8}$/).optional(),
    managerCode: z.string().trim().regex(/^\d{4,8}$/).optional(),
  });

const staffLoginSchema = barLookupSchema
  .extend({
    staffMemberId: uuidSchema.optional(),
    name: z.string().trim().min(1).optional(),
  })
  .refine((value) => value.staffMemberId || value.name, {
    message: "staffMemberId or name is required",
  });

const onboardingSchema = z.object({
  ownerUserId: z.string().min(1).optional(),
  barName: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(3).optional(),
  location: z.string().trim().optional(),
  barSize: z.enum(["small", "medium", "large"]).optional(),
  timezone: z.string().trim().min(1).optional(),
  currency: z.string().trim().length(3).optional(),
  managerName: z.string().trim().min(1).optional(),
  managerCode: z.string().trim().regex(/^\d{4,8}$/).optional(),
});

const categorySetupSchema = z.object({
  categories: z.array(
    z.object({
      id: uuidSchema.optional(),
      name: z.string().trim().min(1),
      type: z
        .enum(["spirit", "liquor", "beer", "wine", "mixer", "keg", "food", "custom", "other"])
        .default("other"),
      sortOrder: z.number().int().nonnegative().default(0),
      products: z
        .array(
          z.object({
            id: uuidSchema.optional(),
            name: z.string().trim().min(1),
            brand: z.string().trim().optional(),
            unitType: z
              .enum(["bottle", "case", "keg", "can", "each", "liter", "milliliter", "ounce", "pound", "gram"])
              .default("bottle"),
            startingQuantity: z.coerce.number().nonnegative().default(0),
            fullStockQuantity: z.coerce.number().nonnegative().default(0),
            reorderPoint: z.coerce.number().nonnegative().optional(),
          })
        )
        .default([]),
    })
  ),
});

const staffSetupSchema = z.object({
  names: z.array(z.string().trim().min(1)).default([]),
  deactivateIds: z.array(uuidSchema).default([]),
});

const bottleDoneSchema = z.object({
  productId: uuidSchema,
  categoryId: uuidSchema.optional(),
  inventoryLocationId: uuidSchema.optional(),
  quantityUsed: z.coerce.number().positive().default(1),
  notes: z.string().trim().optional(),
});

const undoSchema = z.object({
  usageLogId: uuidSchema,
});

const posEstimateSchema = z.object({
  categoryId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  drinkCount: z.coerce.number().nonnegative(),
  source: z.enum(["manual", "mock", "pos"]).default("manual"),
  grossSales: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().optional(),
});

const settingsPatchSchema = z.object({
  defaultInventoryLocationId: uuidSchema.nullable().optional(),
  inventoryCountFrequency: z.string().nullable().optional(),
  lowStockAlertsEnabled: z.boolean().optional(),
  varianceAlertsEnabled: z.boolean().optional(),
  settingsJson: z.record(z.unknown()).optional(),
});

function jsonError(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  message: string
) {
  return c.json({ error: message }, status);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Buffer.from(digest).toString("base64url");
}

async function hmacSha256(value: string) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "on-tap-dev-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return Buffer.from(signature).toString("base64url");
}

async function createBarContextCookie(c: Context, barAccountId: string) {
  const payload = Buffer.from(
    JSON.stringify({ barAccountId, expiresAt: Date.now() + sessionTtlSeconds * 1000 })
  ).toString("base64url");
  const signature = await hmacSha256(payload);

  setCookie(c, barContextCookieName, `${payload}.${signature}`, {
    httpOnly: true,
    sameSite: cookieSameSite,
    secure: isProduction,
    maxAge: sessionTtlSeconds,
    path: "/",
  });
}

async function readBarContext(c: Context) {
  const cookie = getCookie(c, barContextCookieName);
  if (!cookie) return null;

  const [payload, signature] = cookie.split(".");
  if (!payload || !signature || signature !== (await hmacSha256(payload))) {
    deleteCookie(c, barContextCookieName, { path: "/" });
    return null;
  }

  const rawPayload = (() => {
    try {
      return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return null;
    }
  })();
  const parsed = z
    .object({ barAccountId: uuidSchema, expiresAt: z.number().int() })
    .safeParse(rawPayload);
  if (!parsed.success || parsed.data.expiresAt <= Date.now()) {
    deleteCookie(c, barContextCookieName, { path: "/" });
    return null;
  }

  const [barAccount] = await db
    .select(barAccountSummaryColumns())
    .from(barAccounts)
    .where(and(eq(barAccounts.id, parsed.data.barAccountId), eq(barAccounts.status, "active")))
    .limit(1);

  return barAccount ?? null;
}

function clearBarContext(c: Context) {
  deleteCookie(c, barContextCookieName, { path: "/" });
}

async function hashCode(code: string) {
  if (typeof Bun !== "undefined" && Bun.password) {
    return Bun.password.hash(code);
  }

  return code;
}

async function verifyCode(code: string, hash?: string | null) {
  if (!hash) return false;
  if (code === hash) return true;

  if (typeof Bun !== "undefined" && Bun.password) {
    try {
      return await Bun.password.verify(code, hash);
    } catch {
      return false;
    }
  }

  return false;
}

function readIp(c: Context) {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    null
  );
}

function slugifyBarName(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 42) || "bar";

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function uniqueStaffNames(names: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }

  return cleaned;
}

function barAccountSummaryColumns() {
  return {
    id: barAccounts.id,
    name: barAccounts.name,
    slug: barAccounts.slug,
    timezone: barAccounts.timezone,
    currency: barAccounts.currency,
    onboardingCompletedAt: barAccounts.onboardingCompletedAt,
    barSize: barAccounts.barSize,
    location: barAccounts.location,
  };
}

async function listActiveStaff(barAccountId: string) {
  return db
    .select({
      id: staffMembers.id,
      name: staffMembers.name,
      role: staffMembers.role,
      lastLoginAt: staffMembers.lastLoginAt,
    })
    .from(staffMembers)
    .where(and(eq(staffMembers.barAccountId, barAccountId), eq(staffMembers.isActive, true)))
    .orderBy(staffMembers.name);
}

async function listCurrentStaffRoster(barAccountId: string) {
  return db
    .select({
      id: staffMembers.id,
      name: staffMembers.name,
    })
    .from(staffMembers)
    .where(and(eq(staffMembers.barAccountId, barAccountId), eq(staffMembers.isActive, true)))
    .orderBy(staffMembers.name);
}

async function findOwnedBarAccount(ownerUserId: string) {
  const [barAccount] = await db
    .select(barAccountSummaryColumns())
    .from(barAccounts)
    .where(and(eq(barAccounts.ownerUserId, ownerUserId), eq(barAccounts.status, "active")))
    .orderBy(desc(barAccounts.createdAt))
    .limit(1);

  return barAccount;
}

async function createManagerSessionForBar(c: Context, barAccountId: string) {
  const [manager] = await db
    .select({ id: managers.id, name: managers.name, role: managers.role })
    .from(managers)
    .where(and(eq(managers.barAccountId, barAccountId), eq(managers.isActive, true)))
    .orderBy(desc(managers.createdAt))
    .limit(1);

  if (!manager) return null;

  return createAppSession(c, "manager", barAccountId, manager);
}

async function verifyAccountPassword(userId: string, password: string) {
  const accounts = await db
    .select({ password: authAccounts.password })
    .from(authAccounts)
    .where(eq(authAccounts.userId, userId))
    .limit(20);

  for (const account of accounts) {
    if (await verifyCode(password, account.password)) return true;
  }

  return false;
}

async function findBarAccount(input: z.infer<typeof barLookupSchema>) {
  const where = input.barAccountId
    ? eq(barAccounts.id, input.barAccountId)
    : eq(barAccounts.slug, input.barSlug ?? "");

  const [barAccount] = await db
    .select({
      id: barAccounts.id,
      name: barAccounts.name,
      slug: barAccounts.slug,
      timezone: barAccounts.timezone,
      currency: barAccounts.currency,
      onboardingCompletedAt: barAccounts.onboardingCompletedAt,
      barSize: barAccounts.barSize,
      location: barAccounts.location,
    })
    .from(barAccounts)
    .where(and(where, eq(barAccounts.status, "active")))
    .limit(1);

  return barAccount;
}

async function createAppSession(
  c: Context,
  actorType: ActorType,
  barAccountId: string,
  actor: { id: string; name: string; role?: string | null }
) {
  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`;
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000);

  const [session] = await db
    .insert(appSessions)
    .values({
      barAccountId,
      actorType,
      managerId: actorType === "manager" ? actor.id : null,
      staffMemberId: actorType === "staff" ? actor.id : null,
      tokenHash,
      expiresAt,
      lastSeenAt: new Date(),
      ipAddress: readIp(c),
      userAgent: c.req.header("user-agent"),
    })
    .returning({ id: appSessions.id });

  setCookie(c, cookieName, token, {
    httpOnly: true,
    sameSite: cookieSameSite,
    secure: isProduction,
    maxAge: sessionTtlSeconds,
    path: "/",
  });

  return {
    type: actorType,
    appSessionId: session.id,
    actorId: actor.id,
    barAccountId,
    name: actor.name,
    role: actor.role,
  } satisfies ActorSession;
}

async function getActiveStaffShift(barAccountId: string, staffMemberId: string) {
  const [shift] = await db
    .select({ id: staffShifts.id, barNightId: staffShifts.barNightId })
    .from(staffShifts)
    .where(
      and(
        eq(staffShifts.barAccountId, barAccountId),
        eq(staffShifts.staffMemberId, staffMemberId),
        eq(staffShifts.status, "active")
      )
    )
    .orderBy(desc(staffShifts.startedAt))
    .limit(1);

  return shift;
}

async function getActor(c: Context): Promise<ActorSession | null> {
  const token = getCookie(c, cookieName);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const [session] = await db
    .select()
    .from(appSessions)
    .where(
      and(
        eq(appSessions.tokenHash, tokenHash),
        isNull(appSessions.revokedAt),
        gt(appSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) return null;

  await db
    .update(appSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(appSessions.id, session.id));

  if (session.actorType === "manager" && session.managerId) {
    const [manager] = await db
      .select({
        id: managers.id,
        barAccountId: managers.barAccountId,
        name: managers.name,
        role: managers.role,
        isActive: managers.isActive,
      })
      .from(managers)
      .where(
        and(
          eq(managers.id, session.managerId),
          eq(managers.barAccountId, session.barAccountId),
          eq(managers.isActive, true)
        )
      )
      .limit(1);

    return manager
      ? {
          type: "manager",
          appSessionId: session.id,
          actorId: manager.id,
          barAccountId: manager.barAccountId,
          name: manager.name,
          role: manager.role,
        }
      : null;
  }

  if (session.actorType === "staff" && session.staffMemberId) {
    const [staff] = await db
      .select({
        id: staffMembers.id,
        barAccountId: staffMembers.barAccountId,
        name: staffMembers.name,
        role: staffMembers.role,
        isActive: staffMembers.isActive,
      })
      .from(staffMembers)
      .where(
        and(
          eq(staffMembers.id, session.staffMemberId),
          eq(staffMembers.barAccountId, session.barAccountId),
          eq(staffMembers.isActive, true)
        )
      )
      .limit(1);

    if (!staff) return null;

    const activeShift = await getActiveStaffShift(staff.barAccountId, staff.id);
    return {
      type: "staff",
      appSessionId: session.id,
      actorId: staff.id,
      barAccountId: staff.barAccountId,
      name: staff.name,
      role: staff.role,
      staffShiftId: activeShift?.id,
    };
  }

  return null;
}

async function requireActor(c: Context, type?: ActorType) {
  const actor = await getActor(c);
  if (!actor) return null;
  if (type && actor.type !== type) return null;
  return actor;
}

async function revokeCurrentSession(c: Context) {
  const token = getCookie(c, cookieName);
  if (token) {
    await db
      .update(appSessions)
      .set({ revokedAt: new Date() })
      .where(eq(appSessions.tokenHash, await sha256(token)));
  }
  deleteCookie(c, cookieName, { path: "/" });
}

async function audit(
  actor: ActorSession,
  action: string,
  entityType: string,
  entityId?: string,
  metadataJson?: Record<string, unknown>
) {
  await db.insert(auditLogs).values({
    barAccountId: actor.barAccountId,
    actorType: actor.type,
    actorId: actor.actorId,
    action,
    entityType,
    entityId,
    metadataJson,
  });
}

async function getOrCreateActiveNight(
  barAccountId: string,
  managerId?: string | null
) {
  const businessDate = new Date().toISOString().slice(0, 10);
  const [existing] = await db
    .select({ id: barNights.id, businessDate: barNights.businessDate })
    .from(barNights)
    .where(
      and(
        eq(barNights.barAccountId, barAccountId),
        eq(barNights.businessDate, businessDate)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [night] = await db
    .insert(barNights)
    .values({
      barAccountId,
      businessDate,
      openedByManagerId: managerId,
    })
    .returning({ id: barNights.id, businessDate: barNights.businessDate });

  return night;
}

async function getDefaultLocation(barAccountId: string) {
  const [location] = await db
    .select({ id: inventoryLocations.id })
    .from(inventoryLocations)
    .where(eq(inventoryLocations.barAccountId, barAccountId))
    .orderBy(inventoryLocations.sortOrder)
    .limit(1);

  if (location) return location.id;

  const [created] = await db
    .insert(inventoryLocations)
    .values({ barAccountId, name: "Main Bar" })
    .returning({ id: inventoryLocations.id });

  return created.id;
}

async function currentInventoryRows(barAccountId: string) {
  return db
    .select({
      categoryId: inventoryCategories.id,
      categoryName: inventoryCategories.name,
      categoryType: inventoryCategories.type,
      categorySortOrder: inventoryCategories.sortOrder,
      productId: products.id,
      productName: products.name,
      brand: products.brand,
      unitType: products.unitType,
      parLevel: products.parLevel,
      reorderPoint: products.reorderPoint,
      inventoryItemId: inventoryItems.id,
      inventoryLocationId: inventoryItems.inventoryLocationId,
      quantityOnHand: inventoryItems.quantityOnHand,
    })
    .from(inventoryCategories)
    .leftJoin(
      products,
      and(
        eq(products.categoryId, inventoryCategories.id),
        eq(products.isActive, true)
      )
    )
    .leftJoin(
      inventoryItems,
      and(
        eq(inventoryItems.productId, products.id),
        eq(inventoryItems.barAccountId, barAccountId)
      )
    )
    .where(
      and(
        eq(inventoryCategories.barAccountId, barAccountId),
        eq(inventoryCategories.isActive, true)
      )
    )
    .orderBy(inventoryCategories.sortOrder, inventoryCategories.name);
}

function shapeCategoryDashboard(rows: Awaited<ReturnType<typeof currentInventoryRows>>) {
  const categoriesById = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
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
      currentStock: number;
      parLevel: number;
    }
  >();

  for (const row of rows) {
    const category = categoriesById.get(row.categoryId) ?? {
      id: row.categoryId,
      name: row.categoryName,
      type: row.categoryType,
      products: [],
      currentStock: 0,
      parLevel: 0,
    };

    if (row.productId) {
      const currentStock = Number(row.quantityOnHand ?? 0);
      const parLevel = Number(row.parLevel ?? 0);
      category.products.push({
        id: row.productId,
        name: row.productName ?? "Unnamed product",
        brand: row.brand,
        unitType: row.unitType ?? "each",
        currentStock,
        parLevel,
        reorderPoint: Number(row.reorderPoint ?? 0),
        inventoryLocationId: row.inventoryLocationId,
      });
      category.currentStock += currentStock;
      category.parLevel += parLevel;
    }

    categoriesById.set(row.categoryId, category);
  }

  return Array.from(categoriesById.values());
}

async function recalculateLowStockAlert(
  barAccountId: string,
  productId: string,
  categoryId?: string | null,
  barNightId?: string | null
) {
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      reorderPoint: products.reorderPoint,
      parLevel: products.parLevel,
      categoryName: inventoryCategories.name,
    })
    .from(products)
    .leftJoin(
      inventoryCategories,
      eq(products.categoryId, inventoryCategories.id)
    )
    .where(
      and(eq(products.id, productId), eq(products.barAccountId, barAccountId))
    )
    .limit(1);

  if (!product) return;

  const itemRows = await db
    .select({ quantityOnHand: inventoryItems.quantityOnHand })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.barAccountId, barAccountId),
        eq(inventoryItems.productId, productId)
      )
    );

  const currentStock = itemRows.reduce(
    (total, row) => total + Number(row.quantityOnHand ?? 0),
    0
  );

  const trackedAlcohols = new Set(["vodka", "tequila", "gin", "beer", "soju"]);
  const isTracked = trackedAlcohols.has(
    (product.categoryName ?? "").toLowerCase()
  );

  const parLevel = Number(product.parLevel ?? 0);
  const reorderPoint = Number(product.reorderPoint ?? 0);
  const threshold = isTracked ? parLevel / 6 : reorderPoint;

  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.barAccountId, barAccountId),
        eq(alerts.productId, productId),
        eq(alerts.type, "low_stock"),
        eq(alerts.status, "open")
      )
    )
    .limit(1);

  if (threshold > 0 && currentStock <= threshold) {
    const severity = currentStock <= 0 ? "critical" : "warning";
    const displayName = isTracked
      ? (product.categoryName ?? product.name).toUpperCase()
      : product.name.toUpperCase();
    const title = `GET MORE ${displayName}`;
    const message =
      currentStock <= 0
        ? "Out now - replace immediately"
        : `Only ${currentStock} left - grab from back now`;

    if (existing) {
      await db
        .update(alerts)
        .set({ severity, title, message, updatedAt: new Date() })
        .where(eq(alerts.id, existing.id));
      return;
    }

    await db.insert(alerts).values({
      barAccountId,
      barNightId,
      productId,
      categoryId: categoryId ?? product.categoryId,
      type: "low_stock",
      severity,
      title,
      message,
      metadataJson: { currentStock, threshold, parLevel, reorderPoint },
    });
    return;
  }

  if (existing) {
    await db
      .update(alerts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, existing.id));
  }
}

async function recalculateOverpourAlert(
  barAccountId: string,
  barNightId: string,
  categoryId: string,
  drinkCount: number
) {
  const categoryUsage = await db
    .select({ quantityUsed: usageLogs.quantityUsed })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.barAccountId, barAccountId),
        eq(usageLogs.barNightId, barNightId),
        eq(usageLogs.categoryId, categoryId),
        isNull(usageLogs.reversedAt)
      )
    );

  const bottlesLogged = categoryUsage.reduce(
    (total, row) => total + Number(row.quantityUsed ?? 0),
    0
  );
  const ratio = bottlesLogged / Math.max(drinkCount, 1);

  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(
      and(
        eq(alerts.barAccountId, barAccountId),
        eq(alerts.barNightId, barNightId),
        eq(alerts.categoryId, categoryId),
        eq(alerts.type, "overpour"),
        eq(alerts.status, "open")
      )
    )
    .limit(1);

  if (bottlesLogged >= 3 && ratio >= 2) {
    const title = "WATCH OVERPOUR";
    const message = `${bottlesLogged} bottles logged, ${drinkCount} drinks entered`;

    if (existing) {
      await db
        .update(alerts)
        .set({ title, message, severity: "critical", updatedAt: new Date() })
        .where(eq(alerts.id, existing.id));
      return;
    }

    await db.insert(alerts).values({
      barAccountId,
      barNightId,
      categoryId,
      type: "overpour",
      severity: "critical",
      title,
      message,
      metadataJson: { bottlesLogged, drinkCount, ratio },
    });
    return;
  }

  if (existing) {
    await db
      .update(alerts)
      .set({ status: "resolved", resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(alerts.id, existing.id));
  }
}

app.get("/session", async (c) => {
  const actor = await getActor(c);
  if (!actor) return c.json({ authenticated: false });

  const [barAccount] = await db
    .select(barAccountSummaryColumns())
    .from(barAccounts)
    .where(eq(barAccounts.id, actor.barAccountId))
    .limit(1);

  return c.json({ authenticated: true, actor, barAccount });
});

app.post("/account/check-email", async (c) => {
  const body = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .transform((value) => value.toLowerCase()),
    })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [existingUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, body.data.email))
    .limit(1);

  return c.json({ exists: !!existingUser });
});

app.post("/account/register", async (c) => {
  const body = accountRegisterSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [existingUser] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, body.data.email))
    .limit(1);
  if (existingUser) return jsonError(c, 409, "A bar account already exists for that email");

  const ownerUserId = crypto.randomUUID();
  const now = new Date();
  await db.insert(authUsers).values({
    id: ownerUserId,
    name: body.data.managerName ?? body.data.barName,
    email: body.data.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(authAccounts).values({
    id: crypto.randomUUID(),
    accountId: body.data.email,
    providerId: "bar-password",
    userId: ownerUserId,
    password: await hashCode(body.data.password),
    createdAt: now,
    updatedAt: now,
  });

  const [barAccount] = await db
    .insert(barAccounts)
    .values({
      ownerUserId,
      name: body.data.barName,
      slug: slugifyBarName(body.data.barName),
      contactEmail: body.data.email,
      location: body.data.location,
      timezone: body.data.timezone ?? "UTC",
      currency: body.data.currency ?? "USD",
      barSize: body.data.barSize ?? null,
      onboardingCompletedAt: now,
    })
    .returning(barAccountSummaryColumns());

  await db.insert(managers).values({
    barAccountId: barAccount.id,
    name: body.data.managerName ?? "Manager",
    accessCodeHash: await hashCode(body.data.managerCode),
    accessCodeUpdatedAt: now,
    role: "admin_manager",
  });

  const staffNames = uniqueStaffNames(body.data.staffNames);
  if (staffNames.length) {
    await db.insert(staffMembers).values(
      staffNames.map((name) => ({
        barAccountId: barAccount.id,
        name,
      }))
    );
  }

  await getDefaultLocation(barAccount.id);
  await db.insert(barAccountSettings).values({ barAccountId: barAccount.id }).onConflictDoNothing();

  const actor = await createManagerSessionForBar(c, barAccount.id);
  if (!actor) return jsonError(c, 500, "Unable to create manager session");

  await audit(actor, "bar_account_registered", "bar_account", barAccount.id);
  return c.json({ actor, barAccount, staff: await listActiveStaff(barAccount.id), expiresInSeconds: sessionTtlSeconds }, 201);
});

app.post("/account/login", async (c) => {
  const body = accountLoginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [owner] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, body.data.email))
    .limit(1);
  if (!owner || !(await verifyAccountPassword(owner.id, body.data.password))) {
    return jsonError(c, 401, "Invalid account email or password");
  }

  const barAccount = await findOwnedBarAccount(owner.id);
  if (!barAccount) return jsonError(c, 404, "No active bar account found for that login");

  await revokeCurrentSession(c);
  await createBarContextCookie(c, barAccount.id);
  await db.insert(auditLogs).values({
    barAccountId: barAccount.id,
    actorType: "bar_account",
    actorId: barAccount.id,
    action: "bar_account_context_login",
    entityType: "bar_account",
    entityId: barAccount.id,
    ipAddress: readIp(c),
    userAgent: c.req.header("user-agent"),
  });
  return c.json({ barContext: { barAccountId: barAccount.id }, barAccount, staff: await listCurrentStaffRoster(barAccount.id), expiresInSeconds: sessionTtlSeconds });
});

app.get("/bar-context", async (c) => {
  const barAccount = await readBarContext(c);
  if (!barAccount) return c.json({ authenticated: false });
  return c.json({ authenticated: true, barContext: { barAccountId: barAccount.id }, barAccount });
});

app.post("/bar-context/logout", async (c) => {
  clearBarContext(c);
  return c.json({ ok: true });
});

app.get("/staff", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  return c.json({ staff: await listActiveStaff(actor.barAccountId) });
});

async function handleManagerLogin(c: Context) {
  const body = managerLoginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const managerCode = body.data.managerCode ?? body.data.accessCode;
  if (!managerCode) return jsonError(c, 400, "Manager code is required");

  const currentBarContext = await readBarContext(c);
  const barAccount = body.data.barAccountId || body.data.barSlug
    ? await findBarAccount(body.data)
    : currentBarContext;
  if (!barAccount) return jsonError(c, body.data.barAccountId || body.data.barSlug ? 404 : 401, "Bar context required");
  if (!currentBarContext || currentBarContext.id !== barAccount.id) {
    return jsonError(c, 401, "Bar context required");
  }

  const managerRows = await db
    .select({
      id: managers.id,
      name: managers.name,
      role: managers.role,
      accessCodeHash: managers.accessCodeHash,
      failedLoginCount: managers.failedLoginCount,
      lockedUntil: managers.lockedUntil,
    })
    .from(managers)
    .where(
      and(
        eq(managers.barAccountId, barAccount.id),
        eq(managers.isActive, true),
        body.data.name ? eq(managers.name, body.data.name) : sql`true`
      )
    )
    .limit(body.data.name ? 1 : 25);

  const now = new Date();
  let matchedManager: (typeof managerRows)[number] | null = null;
  for (const manager of managerRows) {
    if (manager.lockedUntil && manager.lockedUntil > now) {
      return jsonError(c, 403, "Manager code is temporarily locked");
    }

    if (await verifyCode(managerCode, manager.accessCodeHash)) {
      matchedManager = manager;
      break;
    }
  }

  if (!matchedManager) {
    if (managerRows[0]) {
      const nextFailedCount = (managerRows[0].failedLoginCount ?? 0) + 1;
      await db
        .update(managers)
        .set({
          failedLoginCount: nextFailedCount,
          lockedUntil:
            nextFailedCount >= 5
              ? new Date(Date.now() + 10 * 60 * 1000)
              : null,
        })
        .where(eq(managers.id, managerRows[0].id));
    }
    return jsonError(c, 401, "Invalid manager credentials");
  }

  await db
    .update(managers)
    .set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: now })
    .where(eq(managers.id, matchedManager.id));

  const session = await createAppSession(c, "manager", barAccount.id, matchedManager);
  await audit(session, "manager_login", "manager", matchedManager.id);
  return c.json({ actor: session, barAccount, expiresInSeconds: sessionTtlSeconds });
}

app.post("/login/manager", handleManagerLogin);
app.post("/manager-login", handleManagerLogin);

async function handleStaffLogin(c: Context) {
  const body = staffLoginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const currentActor = await getActor(c);
  const currentBarContext = await readBarContext(c);
  const barAccount =
    body.data.barAccountId || body.data.barSlug
      ? await findBarAccount(body.data)
      : currentBarContext ?? (currentActor ? await findBarAccount({ barAccountId: currentActor.barAccountId }) : null);
  if (!barAccount) return jsonError(c, body.data.barAccountId || body.data.barSlug ? 404 : 401, "Bar context required");

  const trustedBarAccountId = currentActor?.barAccountId ?? currentBarContext?.id;
  if (trustedBarAccountId !== barAccount.id) {
    return jsonError(c, 401, "A current bar context is required to enter staff mode");
  }

  const staffWhere = body.data.staffMemberId
    ? eq(staffMembers.id, body.data.staffMemberId)
    : eq(staffMembers.name, body.data.name ?? "");

  const [staff] = await db
    .select({ id: staffMembers.id, name: staffMembers.name, role: staffMembers.role })
    .from(staffMembers)
    .where(
      and(
        eq(staffMembers.barAccountId, barAccount.id),
        staffWhere,
        eq(staffMembers.isActive, true)
      )
    )
    .limit(1);

  if (!staff) return jsonError(c, 401, "Invalid staff credentials");

  const night = await getOrCreateActiveNight(barAccount.id);
  const existingShift = await getActiveStaffShift(barAccount.id, staff.id);
  const shift =
    existingShift ??
    (
      await db
        .insert(staffShifts)
        .values({
          barAccountId: barAccount.id,
          barNightId: night.id,
          staffMemberId: staff.id,
        })
        .returning({ id: staffShifts.id, barNightId: staffShifts.barNightId })
    )[0];

  await db
    .update(staffMembers)
    .set({ lastLoginAt: new Date() })
    .where(eq(staffMembers.id, staff.id));

  const session = await createAppSession(c, "staff", barAccount.id, staff);
  const actor = { ...session, staffShiftId: shift.id };
  await audit(actor, "staff_login", "staff", staff.id, { staffShiftId: shift.id });
  return c.json({ actor, barAccount, barNight: night, expiresInSeconds: sessionTtlSeconds });
}

app.post("/login/staff", handleStaffLogin);
app.post("/staff-login", handleStaffLogin);

app.get("/staff-roster/current", async (c) => {
  const currentBarContext = await readBarContext(c);
  const actor = await getActor(c);
  const barAccount = currentBarContext ?? (actor ? await findBarAccount({ barAccountId: actor.barAccountId }) : null);
  if (!barAccount) return jsonError(c, 401, "Bar context required");
  return c.json({ staff: await listCurrentStaffRoster(barAccount.id) });
});

app.get("/staff-roster/:barAccountId", async (c) => {
  const barAccountId = c.req.param("barAccountId");
  if (!z.string().uuid().safeParse(barAccountId).success) {
    return jsonError(c, 400, "Invalid bar account ID");
  }
  const barAccount = await readBarContext(c);
  if (!barAccount || barAccount.id !== barAccountId) return jsonError(c, 401, "Bar context required");
  return c.json({ staff: await listCurrentStaffRoster(barAccountId) });
});

app.post("/logout", async (c) => {
  const actor = await getActor(c);
  if (actor) await audit(actor, "logout", actor.type, actor.actorId);
  await revokeCurrentSession(c);
  return c.json({ ok: true });
});

app.post("/onboarding/create-account", async (c) => {
  const body = onboardingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);
  if (!body.data.ownerUserId) {
    return jsonError(c, 400, "ownerUserId is required after Better Auth signup");
  }

  const [barAccount] = await db
    .insert(barAccounts)
    .values({
      ownerUserId: body.data.ownerUserId,
      name: body.data.barName ?? "New Bar",
      slug: body.data.slug,
      location: body.data.location,
      barSize: body.data.barSize,
      timezone: body.data.timezone ?? "UTC",
      currency: body.data.currency ?? "USD",
    })
    .returning({ id: barAccounts.id, name: barAccounts.name, slug: barAccounts.slug });

  if (body.data.managerCode) {
    await db.insert(managers).values({
      barAccountId: barAccount.id,
      name: body.data.managerName ?? "Manager",
      accessCodeHash: await hashCode(body.data.managerCode),
      accessCodeUpdatedAt: new Date(),
      role: "admin_manager",
    });
  }

  await getDefaultLocation(barAccount.id);
  await db.insert(barAccountSettings).values({ barAccountId: barAccount.id }).onConflictDoNothing();
  return c.json({ barAccount }, 201);
});

app.get("/onboarding", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const [barAccount] = await db
    .select()
    .from(barAccounts)
    .where(eq(barAccounts.id, actor.barAccountId))
    .limit(1);
  const categories = await currentInventoryRows(actor.barAccountId);
  const staff = await db
    .select({ id: staffMembers.id, name: staffMembers.name, isActive: staffMembers.isActive })
    .from(staffMembers)
    .where(eq(staffMembers.barAccountId, actor.barAccountId));

  return c.json({
    barAccount,
    categories: shapeCategoryDashboard(categories),
    staff,
  });
});

app.post("/onboarding", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = onboardingSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  await db
    .update(barAccounts)
    .set({
      name: body.data.barName,
      slug: body.data.slug,
      location: body.data.location,
      barSize: body.data.barSize,
      timezone: body.data.timezone,
      currency: body.data.currency,
    })
    .where(eq(barAccounts.id, actor.barAccountId));

  await audit(actor, "onboarding_updated", "bar_account", actor.barAccountId);
  return c.json({ ok: true });
});

app.post("/onboarding/categories", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = categorySetupSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const defaultLocationId = await getDefaultLocation(actor.barAccountId);

  for (const categoryInput of body.data.categories) {
    const [category] = categoryInput.id
      ? await db
          .update(inventoryCategories)
          .set({
            name: categoryInput.name,
            type: categoryInput.type,
            sortOrder: categoryInput.sortOrder,
          })
          .where(
            and(
              eq(inventoryCategories.id, categoryInput.id),
              eq(inventoryCategories.barAccountId, actor.barAccountId)
            )
          )
          .returning({ id: inventoryCategories.id })
      : await db
          .insert(inventoryCategories)
          .values({
            barAccountId: actor.barAccountId,
            name: categoryInput.name,
            type: categoryInput.type,
            sortOrder: categoryInput.sortOrder,
          })
          .returning({ id: inventoryCategories.id });

    for (const productInput of categoryInput.products) {
      const [product] = productInput.id
        ? await db
            .update(products)
            .set({
              categoryId: category.id,
              name: productInput.name,
              brand: productInput.brand,
              unitType: productInput.unitType,
              parLevel: String(productInput.fullStockQuantity),
              reorderPoint: String(
                productInput.reorderPoint ?? Math.max(0, productInput.fullStockQuantity * 0.25)
              ),
            })
            .where(
              and(eq(products.id, productInput.id), eq(products.barAccountId, actor.barAccountId))
            )
            .returning({ id: products.id })
        : await db
            .insert(products)
            .values({
              barAccountId: actor.barAccountId,
              categoryId: category.id,
              name: productInput.name,
              brand: productInput.brand,
              unitType: productInput.unitType,
              parLevel: String(productInput.fullStockQuantity),
              reorderPoint: String(
                productInput.reorderPoint ?? Math.max(0, productInput.fullStockQuantity * 0.25)
              ),
            })
            .returning({ id: products.id });

      await db
        .insert(inventoryItems)
        .values({
          barAccountId: actor.barAccountId,
          productId: product.id,
          inventoryLocationId: defaultLocationId,
          quantityOnHand: String(productInput.startingQuantity),
        })
        .onConflictDoUpdate({
          target: [inventoryItems.productId, inventoryItems.inventoryLocationId],
          set: { quantityOnHand: String(productInput.startingQuantity), updatedAt: new Date() },
        });
    }
  }

  await audit(actor, "inventory_setup_saved", "bar_account", actor.barAccountId);
  return c.json({ ok: true });
});

app.post("/onboarding/staff", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = staffSetupSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  for (const name of body.data.names) {
    await db
      .insert(staffMembers)
      .values({ barAccountId: actor.barAccountId, name })
      .onConflictDoNothing();
  }

  if (body.data.deactivateIds.length) {
    for (const id of body.data.deactivateIds) {
      await db
        .update(staffMembers)
        .set({ isActive: false })
        .where(and(eq(staffMembers.id, id), eq(staffMembers.barAccountId, actor.barAccountId)));
    }
  }

  await audit(actor, "staff_setup_saved", "bar_account", actor.barAccountId);
  return c.json({ ok: true });
});

app.post("/onboarding/complete", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  await db
    .update(barAccounts)
    .set({ onboardingCompletedAt: new Date() })
    .where(eq(barAccounts.id, actor.barAccountId));
  await audit(actor, "onboarding_completed", "bar_account", actor.barAccountId);
  return c.json({ ok: true });
});

app.get("/bartender/dashboard", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  const night = await getOrCreateActiveNight(
    actor.barAccountId,
    actor.type === "manager" ? actor.actorId : null
  );
  const rows = await currentInventoryRows(actor.barAccountId);
  const nightAlerts = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      severity: alerts.severity,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      triggeredAt: alerts.triggeredAt,
      resolvedAt: alerts.resolvedAt,
      categoryId: alerts.categoryId,
      categoryName: inventoryCategories.name,
    })
    .from(alerts)
    .leftJoin(inventoryCategories, eq(alerts.categoryId, inventoryCategories.id))
    .where(and(eq(alerts.barAccountId, actor.barAccountId), eq(alerts.barNightId, night.id)))
    .orderBy(desc(alerts.triggeredAt))
    .limit(50);

  const categories = shapeCategoryDashboard(rows);

  const usage = await db
    .select({
      categoryId: usageLogs.categoryId,
      quantityUsed: usageLogs.quantityUsed,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id),
        isNull(usageLogs.reversedAt)
      )
    );

  const usageByCategory = new Map<string, number>();
  for (const row of usage) {
    if (!row.categoryId) continue;
    usageByCategory.set(
      row.categoryId,
      (usageByCategory.get(row.categoryId) ?? 0) + Number(row.quantityUsed ?? 0)
    );
  }

  return c.json({
    barNight: night,
    categories,
    usageByCategory: categories.map((category) => ({
      categoryId: category.id,
      name: category.name,
      bottlesUsed: usageByCategory.get(category.id) ?? 0,
    })),
    alerts: nightAlerts,
  });
});

app.get("/bartender/recent-usage", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  const night = await getOrCreateActiveNight(
    actor.barAccountId,
    actor.type === "manager" ? actor.actorId : null
  );
  const logs = await db
    .select({
      id: usageLogs.id,
      productId: usageLogs.productId,
      categoryId: usageLogs.categoryId,
      quantityUsed: usageLogs.quantityUsed,
      occurredAt: usageLogs.occurredAt,
      reversedAt: usageLogs.reversedAt,
      productName: products.name,
      categoryName: inventoryCategories.name,
    })
    .from(usageLogs)
    .leftJoin(products, eq(usageLogs.productId, products.id))
    .leftJoin(inventoryCategories, eq(usageLogs.categoryId, inventoryCategories.id))
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id)
      )
    )
    .orderBy(desc(usageLogs.occurredAt))
    .limit(50);

  return c.json({ usageLogs: logs });
});

app.post("/bartender/bottle-done", handleBottleDone);
app.post("/bottle-done", handleBottleDone);

async function handleBottleDone(c: Context) {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  const body = bottleDoneSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [item] = await db
    .select({
      productId: inventoryItems.productId,
      inventoryLocationId: inventoryItems.inventoryLocationId,
      categoryId: products.categoryId,
    })
    .from(inventoryItems)
    .innerJoin(products, eq(inventoryItems.productId, products.id))
    .where(
      and(
        eq(inventoryItems.barAccountId, actor.barAccountId),
        eq(inventoryItems.productId, body.data.productId),
        body.data.inventoryLocationId
          ? eq(inventoryItems.inventoryLocationId, body.data.inventoryLocationId)
          : sql`true`
      )
    )
    .limit(1);

  if (!item) return jsonError(c, 404, "Inventory item not found");

  const night = await getOrCreateActiveNight(
    actor.barAccountId,
    actor.type === "manager" ? actor.actorId : null
  );
  const activeShift =
    actor.type === "staff"
      ? await getActiveStaffShift(actor.barAccountId, actor.actorId)
      : null;

  const [usageLog] = await db
    .insert(usageLogs)
    .values({
      barAccountId: actor.barAccountId,
      barNightId: night.id,
      staffShiftId: activeShift?.id,
      productId: item.productId,
      categoryId: body.data.categoryId ?? item.categoryId,
      inventoryLocationId: item.inventoryLocationId,
      staffMemberId: actor.type === "staff" ? actor.actorId : null,
      managerId: actor.type === "manager" ? actor.actorId : null,
      quantityUsed: String(body.data.quantityUsed),
      reason: "manual_entry",
      notes: body.data.notes,
    })
    .returning({ id: usageLogs.id });

  await db
    .update(inventoryItems)
    .set({
      quantityOnHand: sql`${inventoryItems.quantityOnHand} - ${String(body.data.quantityUsed)}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(inventoryItems.barAccountId, actor.barAccountId),
        eq(inventoryItems.productId, item.productId),
        eq(inventoryItems.inventoryLocationId, item.inventoryLocationId)
      )
    );

  await recalculateLowStockAlert(
    actor.barAccountId,
    item.productId,
    body.data.categoryId ?? item.categoryId,
    night.id
  );
  await audit(actor, "bottle_done", "usage_log", usageLog.id, body.data);
  return c.json({ ok: true, usageLogId: usageLog.id });
}

app.post("/bartender/bottle-done/:id/undo", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  return undoUsage(c, c.req.param("id"), actor);
});

app.post("/undo", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  const body = undoSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);
  return undoUsage(c, body.data.usageLogId, actor);
});

async function undoUsage(c: Context, usageLogId: string, actor: ActorSession) {
  const [usageLog] = await db
    .select({
      id: usageLogs.id,
      productId: usageLogs.productId,
      inventoryLocationId: usageLogs.inventoryLocationId,
      categoryId: usageLogs.categoryId,
      quantityUsed: usageLogs.quantityUsed,
      barNightId: usageLogs.barNightId,
      reversedAt: usageLogs.reversedAt,
    })
    .from(usageLogs)
    .where(and(eq(usageLogs.id, usageLogId), eq(usageLogs.barAccountId, actor.barAccountId)))
    .limit(1);

  if (!usageLog) return jsonError(c, 404, "Usage log not found");
  if (usageLog.reversedAt) return jsonError(c, 409, "Usage log already undone");

  await db
    .update(usageLogs)
    .set({
      reversedAt: new Date(),
      reversedByManagerId: actor.type === "manager" ? actor.actorId : null,
      reversedByStaffId: actor.type === "staff" ? actor.actorId : null,
    })
    .where(eq(usageLogs.id, usageLog.id));

  if (usageLog.inventoryLocationId) {
    await db
      .update(inventoryItems)
      .set({
        quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${usageLog.quantityUsed}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.barAccountId, actor.barAccountId),
          eq(inventoryItems.productId, usageLog.productId),
          eq(inventoryItems.inventoryLocationId, usageLog.inventoryLocationId)
        )
      );
  }

  await recalculateLowStockAlert(
    actor.barAccountId,
    usageLog.productId,
    usageLog.categoryId,
    usageLog.barNightId
  );
  await audit(actor, "undo_bottle_done", "usage_log", usageLog.id);
  return c.json({ ok: true, usageLogId: usageLog.id });
}

app.post("/bartender/clock-out", handleClockOut);
app.post("/clock-out", handleClockOut);

async function handleClockOut(c: Context) {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");

  if (actor.type === "staff") {
    await db
      .update(staffShifts)
      .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(staffShifts.barAccountId, actor.barAccountId),
          eq(staffShifts.staffMemberId, actor.actorId),
          eq(staffShifts.status, "active")
        )
      );
  }

  await audit(actor, "clock_out", actor.type, actor.actorId);
  await revokeCurrentSession(c);
  return c.json({ ok: true });
}

app.get("/boss/dashboard", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const night = await getOrCreateActiveNight(actor.barAccountId, actor.actorId);
  const rows = await currentInventoryRows(actor.barAccountId);
  const categories = shapeCategoryDashboard(rows);
  const usage = await db
    .select({
      categoryId: usageLogs.categoryId,
      quantityUsed: usageLogs.quantityUsed,
      unitType: products.unitType,
    })
    .from(usageLogs)
    .innerJoin(products, eq(usageLogs.productId, products.id))
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id),
        isNull(usageLogs.reversedAt)
      )
    );

  const usageByCategory = new Map<string, number>();
  let kegsUsed = 0;
  for (const row of usage) {
    if (!row.categoryId) continue;
    usageByCategory.set(
      row.categoryId,
      (usageByCategory.get(row.categoryId) ?? 0) + Number(row.quantityUsed ?? 0)
    );
    if (row.unitType === "keg") {
      kegsUsed += Number(row.quantityUsed ?? 0);
    }
  }

  const posAgg = await db
    .select({
      totalDrinks: sql<string>`COALESCE(SUM(${posEstimates.drinkCount}), 0)`,
    })
    .from(posEstimates)
    .where(
      and(
        eq(posEstimates.barAccountId, actor.barAccountId),
        eq(posEstimates.barNightId, night.id)
      )
    );
  const posDrinkCount = Number(posAgg[0]?.totalDrinks ?? 0);
  const bottlesUsed = usage.reduce((total, row) => total + Number(row.quantityUsed ?? 0), 0);
  let variancePct: number | null = null;
  if (posDrinkCount > 0) {
    variancePct = Number((((bottlesUsed - posDrinkCount) / posDrinkCount) * 100).toFixed(1));
  }

  const nightAlerts = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      severity: alerts.severity,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      triggeredAt: alerts.triggeredAt,
      resolvedAt: alerts.resolvedAt,
      categoryId: alerts.categoryId,
      categoryName: inventoryCategories.name,
    })
    .from(alerts)
    .leftJoin(inventoryCategories, eq(alerts.categoryId, inventoryCategories.id))
    .where(and(eq(alerts.barAccountId, actor.barAccountId), eq(alerts.barNightId, night.id)))
    .orderBy(desc(alerts.triggeredAt))
    .limit(50);

  const reorderRecommendations = categories.flatMap((category) =>
    category.products
      .filter((product) => product.reorderPoint > 0 && product.currentStock <= product.reorderPoint)
      .map((product) => ({
        categoryId: category.id,
        categoryName: category.name,
        productId: product.id,
        productName: product.name,
        currentStock: product.currentStock,
        fullStock: product.parLevel,
        recommendedQuantity: Math.max(product.parLevel - product.currentStock, 0),
      }))
  );

  return c.json({
    barNight: night,
    categories,
    stats: {
      bottlesUsed,
      kegsUsed,
      alertsFlagged: nightAlerts.length,
      reorderRecommendations: reorderRecommendations.length,
      variancePct,
    },
    usageByCategory: categories.map((category) => ({
      categoryId: category.id,
      name: category.name,
      bottlesUsed: usageByCategory.get(category.id) ?? 0,
    })),
    alerts: nightAlerts,
    reorderRecommendations,
  });
});

app.get("/boss/previous-nights", handlePreviousNights);
app.get("/previous-nights", handlePreviousNights);

async function handlePreviousNights(c: Context) {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const nights = await db
    .select()
    .from(barNights)
    .where(eq(barNights.barAccountId, actor.barAccountId))
    .orderBy(desc(barNights.businessDate))
    .limit(30);

  const nightIds = nights.map((n) => n.id);
  const usageAgg = nightIds.length
    ? await db
        .select({
          barNightId: usageLogs.barNightId,
          totalUsed: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
        })
        .from(usageLogs)
        .where(
          and(
            eq(usageLogs.barAccountId, actor.barAccountId),
            inArray(usageLogs.barNightId, nightIds),
            isNull(usageLogs.reversedAt)
          )
        )
        .groupBy(usageLogs.barNightId)
    : [];

  const usageByCategoryAgg = nightIds.length
    ? await db
        .select({
          barNightId: usageLogs.barNightId,
          categoryId: usageLogs.categoryId,
          categoryName: inventoryCategories.name,
          totalUsed: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
        })
        .from(usageLogs)
        .leftJoin(inventoryCategories, eq(usageLogs.categoryId, inventoryCategories.id))
        .where(
          and(
            eq(usageLogs.barAccountId, actor.barAccountId),
            inArray(usageLogs.barNightId, nightIds),
            isNull(usageLogs.reversedAt)
          )
        )
        .groupBy(usageLogs.barNightId, usageLogs.categoryId, inventoryCategories.name)
    : [];

  const salesAgg = nightIds.length
    ? await db
        .select({
          barNightId: posEstimates.barNightId,
          totalSales: sql<string>`COALESCE(SUM(${posEstimates.grossSales}), 0)`,
        })
        .from(posEstimates)
        .where(
          and(
            eq(posEstimates.barAccountId, actor.barAccountId),
            inArray(posEstimates.barNightId, nightIds)
          )
        )
        .groupBy(posEstimates.barNightId)
    : [];

  const usageMap = new Map(usageAgg.map((u) => [u.barNightId, Number(u.totalUsed)]));
  const usageByCategoryMap = new Map<
    string,
    Array<{ categoryId: string; name: string; bottlesUsed: number }>
  >();
  for (const row of usageByCategoryAgg) {
    if (!row.barNightId || !row.categoryId) continue;
    const items = usageByCategoryMap.get(row.barNightId) ?? [];
    items.push({
      categoryId: row.categoryId,
      name: row.categoryName ?? "Uncategorized",
      bottlesUsed: Number(row.totalUsed),
    });
    usageByCategoryMap.set(row.barNightId, items);
  }
  const salesMap = new Map(salesAgg.map((s) => [s.barNightId, Number(s.totalSales)]));

  const alertsAgg = nightIds.length
    ? await db
        .select({
          barNightId: alerts.barNightId,
          count: sql<string>`COUNT(*)`,
        })
        .from(alerts)
        .where(
          and(
            eq(alerts.barAccountId, actor.barAccountId),
            inArray(alerts.barNightId, nightIds)
          )
        )
        .groupBy(alerts.barNightId)
    : [];

  const alertsMap = new Map(alertsAgg.map((a) => [a.barNightId, Number(a.count)]));

  const enriched = nights.map((night) => ({
    ...night,
    bottlesUsed: usageMap.get(night.id) ?? 0,
    grossSales: salesMap.get(night.id) ?? 0,
    alertsFlagged: alertsMap.get(night.id) ?? 0,
    usageByCategory: usageByCategoryMap.get(night.id) ?? [],
  }));

  return c.json({ nights: enriched });
}

app.get("/boss/previous-nights/:id", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const nightId = c.req.param("id");

  const [night] = await db
    .select()
    .from(barNights)
    .where(and(eq(barNights.id, nightId), eq(barNights.barAccountId, actor.barAccountId)))
    .limit(1);
  if (!night) return jsonError(c, 404, "Night not found");

  const usage = await db
    .select()
    .from(usageLogs)
    .where(and(eq(usageLogs.barAccountId, actor.barAccountId), eq(usageLogs.barNightId, nightId)))
    .orderBy(desc(usageLogs.occurredAt))
    .limit(500);
  const shifts = await db
    .select()
    .from(staffShifts)
    .where(and(eq(staffShifts.barAccountId, actor.barAccountId), eq(staffShifts.barNightId, nightId)))
    .limit(100);
  const nightAlerts = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      severity: alerts.severity,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      triggeredAt: alerts.triggeredAt,
      categoryId: alerts.categoryId,
      categoryName: inventoryCategories.name,
    })
    .from(alerts)
    .leftJoin(inventoryCategories, eq(alerts.categoryId, inventoryCategories.id))
    .where(and(eq(alerts.barAccountId, actor.barAccountId), eq(alerts.barNightId, nightId)))
    .orderBy(desc(alerts.triggeredAt))
    .limit(100);

  return c.json({ night, usage, shifts, alerts: nightAlerts });
});

app.post("/boss/reports/unlock", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = z.object({ managerCode: z.string().regex(/^\d{4,8}$/) }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [manager] = await db
    .select({ accessCodeHash: managers.accessCodeHash })
    .from(managers)
    .where(and(eq(managers.id, actor.actorId), eq(managers.barAccountId, actor.barAccountId)))
    .limit(1);
  if (!manager || !(await verifyCode(body.data.managerCode, manager.accessCodeHash))) {
    return jsonError(c, 401, "Invalid manager code");
  }

  await audit(actor, "reports_unlocked", "manager", actor.actorId);
  return c.json({ unlocked: true, expiresInSeconds: 10 * 60 });
});

app.get("/boss/pos-estimates", handleGetPosEstimates);
app.get("/pos-estimates", handleGetPosEstimates);

async function handleGetPosEstimates(c: Context) {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const night = await getOrCreateActiveNight(actor.barAccountId, actor.actorId);
  const estimates = await db
    .select()
    .from(posEstimates)
    .where(and(eq(posEstimates.barAccountId, actor.barAccountId), eq(posEstimates.barNightId, night.id)))
    .orderBy(desc(posEstimates.createdAt));
  return c.json({ barNight: night, estimates });
}

app.post("/boss/pos-estimates", handleCreatePosEstimate);
app.post("/pos-estimates", handleCreatePosEstimate);

async function handleCreatePosEstimate(c: Context) {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = posEstimateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);
  if (!body.data.categoryId && !body.data.productId) {
    return jsonError(c, 400, "categoryId or productId is required");
  }

  const night = await getOrCreateActiveNight(actor.barAccountId, actor.actorId);
  const [estimate] = await db
    .insert(posEstimates)
    .values({
      barAccountId: actor.barAccountId,
      barNightId: night.id,
      categoryId: body.data.categoryId,
      productId: body.data.productId,
      enteredByManagerId: actor.actorId,
      drinkCount: String(body.data.drinkCount),
      source: body.data.source,
      grossSales: body.data.grossSales ? String(body.data.grossSales) : null,
      notes: body.data.notes,
    })
    .returning();

  if (body.data.categoryId) {
    await recalculateOverpourAlert(
      actor.barAccountId,
      night.id,
      body.data.categoryId,
      body.data.drinkCount
    );
  }

  await audit(actor, "pos_estimate_created", "pos_estimate", estimate.id);
  return c.json({ estimate }, 201);
}

app.post("/pos/generate-mock", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const night = await getOrCreateActiveNight(actor.barAccountId, actor.actorId);
  const [barAccount] = await db.select({ barSize: barAccounts.barSize }).from(barAccounts).where(eq(barAccounts.id, actor.barAccountId)).limit(1);

  const existingMock = await db.select({ id: posEstimates.id }).from(posEstimates).where(and(eq(posEstimates.barAccountId, actor.barAccountId), eq(posEstimates.barNightId, night.id), eq(posEstimates.source, "mock"))).limit(1);
  if (existingMock.length > 0) {
    return jsonError(c, 409, "Mock POS data already generated for this night");
  }

  const categories = await db.select({ id: inventoryCategories.id, name: inventoryCategories.name }).from(inventoryCategories).where(eq(inventoryCategories.barAccountId, actor.barAccountId));
  if (categories.length === 0) {
    return jsonError(c, 400, "No inventory categories found");
  }

  const size = barAccount?.barSize ?? "medium";
  const totalDrinks = size === "small" ? Math.floor(50 + Math.random() * 70) : size === "large" ? Math.floor(300 + Math.random() * 400) : Math.floor(120 + Math.random() * 180);
  const avgPrice = 12;
  const totalSales = totalDrinks * avgPrice;

  const weights = categories.map(() => 0.5 + Math.random());
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const estimates = [];
  for (let i = 0; i < categories.length; i++) {
    const categoryDrinks = Math.max(1, Math.round((weights[i] / totalWeight) * totalDrinks));
    const [estimate] = await db.insert(posEstimates).values({
      barAccountId: actor.barAccountId,
      barNightId: night.id,
      categoryId: categories[i].id,
      enteredByManagerId: actor.actorId,
      drinkCount: String(categoryDrinks),
      source: "mock",
      grossSales: String(categoryDrinks * avgPrice),
      notes: "Auto-generated mock POS data",
    }).returning();
    estimates.push(estimate);

    await recalculateOverpourAlert(actor.barAccountId, night.id, categories[i].id, categoryDrinks);
  }

  await audit(actor, "mock_pos_generated", "pos_estimate", night.id, { count: estimates.length, totalDrinks, totalSales });
  return c.json({ estimates, totalDrinks, totalSales }, 201);
});

app.get("/settings", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const [settings] = await db
    .select()
    .from(barAccountSettings)
    .where(eq(barAccountSettings.barAccountId, actor.barAccountId))
    .limit(1);
  const staff = await db
    .select({
      id: staffMembers.id,
      name: staffMembers.name,
      role: staffMembers.role,
      isActive: staffMembers.isActive,
      lastLoginAt: staffMembers.lastLoginAt,
    })
    .from(staffMembers)
    .where(eq(staffMembers.barAccountId, actor.barAccountId))
    .orderBy(staffMembers.name);
  const rows = await currentInventoryRows(actor.barAccountId);

  return c.json({ settings: settings ?? null, staff, categories: shapeCategoryDashboard(rows) });
});

app.patch("/settings", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = settingsPatchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [settings] = await db
    .insert(barAccountSettings)
    .values({ barAccountId: actor.barAccountId, ...body.data })
    .onConflictDoUpdate({ target: barAccountSettings.barAccountId, set: body.data })
    .returning();
  await audit(actor, "settings_updated", "bar_account_settings", settings.id, body.data);
  return c.json({ settings });
});

app.patch("/settings/staff", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = staffSetupSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  for (const name of body.data.names) {
    await db
      .insert(staffMembers)
      .values({ barAccountId: actor.barAccountId, name })
      .onConflictDoNothing();
  }
  for (const id of body.data.deactivateIds) {
    await db
      .update(staffMembers)
      .set({ isActive: false })
      .where(and(eq(staffMembers.id, id), eq(staffMembers.barAccountId, actor.barAccountId)));
  }
  await audit(actor, "staff_settings_updated", "bar_account", actor.barAccountId);
  return c.json({ ok: true });
});

app.patch("/settings/categories", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  return app.request("/onboarding/categories", { method: "POST", body: await c.req.text(), headers: c.req.raw.headers });
});

app.get("/counts/:countId/lines", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");
  const countId = c.req.param("countId");
  const lines = await db
    .select()
    .from(inventoryCountLines)
    .where(
      and(
        eq(inventoryCountLines.inventoryCountId, countId),
        eq(inventoryCountLines.barAccountId, actor.barAccountId)
      )
    )
    .limit(500);
  return c.json({ lines });
});

// Inventory routes
app.get("/inventory/catalog", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const categories = await db
    .select()
    .from(inventoryCategories)
    .where(and(eq(inventoryCategories.barAccountId, actor.barAccountId), eq(inventoryCategories.isActive, true)))
    .orderBy(inventoryCategories.sortOrder);

  const allProducts = await db
    .select()
    .from(products)
    .where(eq(products.barAccountId, actor.barAccountId))
    .orderBy(products.name);

  const allInventoryItems = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.barAccountId, actor.barAccountId));

  const allSuppliers = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(and(eq(suppliers.barAccountId, actor.barAccountId), eq(suppliers.isActive, true)))
    .orderBy(suppliers.name);

  return c.json({ categories, products: allProducts, inventoryItems: allInventoryItems, suppliers: allSuppliers });
});

app.post("/inventory/categories", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = z.object({ name: trimmedString.max(80), type: inventoryCategoryTypeSchema, sortOrder: z.number().int().nonnegative().optional() }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [category] = await db.insert(inventoryCategories).values({ barAccountId: actor.barAccountId, name: body.data.name, type: body.data.type, sortOrder: body.data.sortOrder ?? 0 }).returning();
  await audit(actor, "category_created", "inventory_categories", category.id, body.data);
  return c.json({ category }, 201);
});

app.patch("/inventory/categories/:id", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const id = c.req.param("id");
  const body = z.object({ name: trimmedString.max(80).optional(), type: inventoryCategoryTypeSchema.optional(), sortOrder: z.number().int().nonnegative().optional(), isActive: z.boolean().optional() }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [category] = await db.update(inventoryCategories).set(body.data).where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.barAccountId, actor.barAccountId))).returning();
  if (!category) return jsonError(c, 404, "Category not found");
  await audit(actor, "category_updated", "inventory_categories", category.id, body.data);
  return c.json({ category });
});

app.delete("/inventory/categories/:id", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const id = c.req.param("id");

  const productCount = await db.select({ count: sql<number>`count(*)` }).from(products).where(and(eq(products.categoryId, id), eq(products.barAccountId, actor.barAccountId)));
  if (productCount[0]?.count > 0) return jsonError(c, 409, "Cannot delete category with products");

  await db.delete(inventoryCategories).where(and(eq(inventoryCategories.id, id), eq(inventoryCategories.barAccountId, actor.barAccountId)));
  await audit(actor, "category_deleted", "inventory_categories", id);
  return c.json({ ok: true });
});

app.post("/inventory/categories/:id/restock", async (c) => {
  const actor = await requireActor(c);
  if (!actor) return jsonError(c, 401, "Session required");

  const categoryId = c.req.param("id");
  const parsedCategoryId = uuidSchema.safeParse(categoryId);
  if (!parsedCategoryId.success) return jsonError(c, 400, "Invalid category id");

  const [category] = await db
    .select({ id: inventoryCategories.id, name: inventoryCategories.name })
    .from(inventoryCategories)
    .where(
      and(
        eq(inventoryCategories.id, parsedCategoryId.data),
        eq(inventoryCategories.barAccountId, actor.barAccountId),
        eq(inventoryCategories.isActive, true)
      )
    )
    .limit(1);

  if (!category) return jsonError(c, 404, "Category not found");

  const rows = await db
    .select({
      productId: products.id,
      productName: products.name,
      parLevel: products.parLevel,
      reorderPoint: products.reorderPoint,
      inventoryItemId: inventoryItems.id,
      inventoryLocationId: inventoryItems.inventoryLocationId,
      quantityOnHand: inventoryItems.quantityOnHand,
    })
    .from(products)
    .innerJoin(
      inventoryItems,
      and(
        eq(inventoryItems.productId, products.id),
        eq(inventoryItems.barAccountId, actor.barAccountId)
      )
    )
    .where(
      and(
        eq(products.barAccountId, actor.barAccountId),
        eq(products.categoryId, category.id),
        eq(products.isActive, true)
      )
    );

  const productsById = new Map<
    string,
    {
      id: string;
      name: string;
      parLevel: number;
      currentStock: number;
      restockItemId: string;
      restockLocationId: string;
    }
  >();

  for (const row of rows) {
    const existing = productsById.get(row.productId) ?? {
      id: row.productId,
      name: row.productName,
      parLevel: Number(row.parLevel ?? 0),
      currentStock: 0,
      restockItemId: row.inventoryItemId,
      restockLocationId: row.inventoryLocationId,
    };

    existing.currentStock += Number(row.quantityOnHand ?? 0);
    productsById.set(row.productId, existing);
  }

  const night = await getOrCreateActiveNight(
    actor.barAccountId,
    actor.type === "manager" ? actor.actorId : null
  );
  let quantityAdded = 0;
  let productsRestocked = 0;

  for (const product of productsById.values()) {
    const delta = Math.max(product.parLevel - product.currentStock, 0);

    if (delta > 0) {
      await db
        .update(inventoryItems)
        .set({
          quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${String(delta)}`,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, product.restockItemId));

      await db.insert(stockAdjustments).values({
        barAccountId: actor.barAccountId,
        productId: product.id,
        inventoryLocationId: product.restockLocationId,
        managerId: actor.type === "manager" ? actor.actorId : null,
        adjustmentType: "manual_correction",
        quantityDelta: String(delta),
        reason: `Restocked ${category.name} to full stock`,
        notes: actor.type === "staff" ? `Restocked by ${actor.name}` : undefined,
      });

      quantityAdded += delta;
      productsRestocked += 1;
    }

    await recalculateLowStockAlert(actor.barAccountId, product.id, category.id, night.id);
  }

  await audit(actor, "category_restocked", "inventory_categories", category.id, {
    categoryName: category.name,
    productsRestocked,
    quantityAdded,
  });

  return c.json({ ok: true, categoryId: category.id, productsRestocked, quantityAdded });
});

app.post("/inventory/products", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = inventoryProductCreateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const insertData = { barAccountId: actor.barAccountId, ...body.data };
  const [product] = await db.insert(products).values({
    ...insertData,
    costPerUnit: insertData.costPerUnit !== undefined ? String(insertData.costPerUnit) : undefined,
    sellingPrice: insertData.sellingPrice !== undefined ? String(insertData.sellingPrice) : undefined,
    parLevel: insertData.parLevel !== undefined ? String(insertData.parLevel) : undefined,
    reorderPoint: insertData.reorderPoint !== undefined ? String(insertData.reorderPoint) : undefined,
  }).returning();

  const [settings] = await db.select({ defaultLocationId: barAccountSettings.defaultInventoryLocationId }).from(barAccountSettings).where(eq(barAccountSettings.barAccountId, actor.barAccountId)).limit(1);

  if (settings?.defaultLocationId) {
    await db.insert(inventoryItems).values({ barAccountId: actor.barAccountId, productId: product.id, inventoryLocationId: settings.defaultLocationId, quantityOnHand: "0" });
  }

  await audit(actor, "product_created", "products", product.id, body.data);
  return c.json({ product }, 201);
});

app.patch("/inventory/products/:id", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const id = c.req.param("id");
  const body = inventoryProductUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const updateData = body.data;
  const [product] = await db.update(products).set({
    ...updateData,
    costPerUnit: updateData.costPerUnit !== undefined ? String(updateData.costPerUnit) : undefined,
    sellingPrice: updateData.sellingPrice !== undefined ? String(updateData.sellingPrice) : undefined,
    parLevel: updateData.parLevel !== undefined ? String(updateData.parLevel) : undefined,
    reorderPoint: updateData.reorderPoint !== undefined ? String(updateData.reorderPoint) : undefined,
  }).where(and(eq(products.id, id), eq(products.barAccountId, actor.barAccountId))).returning();
  if (!product) return jsonError(c, 404, "Product not found");
  await audit(actor, "product_updated", "products", product.id, body.data);
  return c.json({ product });
});

app.post("/inventory/products/:id/toggle", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const id = c.req.param("id");
  const body = z.object({ isActive: z.boolean() }).safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const [product] = await db.update(products).set({ isActive: body.data.isActive }).where(and(eq(products.id, id), eq(products.barAccountId, actor.barAccountId))).returning();
  if (!product) return jsonError(c, 404, "Product not found");
  await audit(actor, body.data.isActive ? "product_activated" : "product_deactivated", "products", product.id);
  return c.json({ product });
});

app.post("/inventory/adjust", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = stockAdjustmentSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { productId, inventoryLocationId, adjustmentType, quantityDelta, reason, notes } = body.data;

  const [item] = await db
    .update(inventoryItems)
    .set({ quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${String(quantityDelta)}` })
    .where(and(eq(inventoryItems.barAccountId, actor.barAccountId), eq(inventoryItems.productId, productId), eq(inventoryItems.inventoryLocationId, inventoryLocationId)))
    .returning();

  if (!item) return jsonError(c, 404, "Inventory item not found");

  const [adjustment] = await db
    .insert(stockAdjustments)
    .values({ barAccountId: actor.barAccountId, productId, inventoryLocationId, managerId: actor.actorId as any, adjustmentType, quantityDelta: String(quantityDelta), reason, notes })
    .returning();

  await audit(actor, "stock_adjusted", "inventory_items", item.id, { productId, quantityDelta, adjustmentType, reason });

  // Trigger low-stock alert recalculation
  const [product] = await db.select({ reorderPoint: products.reorderPoint, parLevel: products.parLevel, name: products.name }).from(products).where(and(eq(products.id, productId), eq(products.barAccountId, actor.barAccountId))).limit(1);
  if (product && item.quantityOnHand !== null) {
    const currentStock = Number(item.quantityOnHand);
    const reorderPoint = Number(product.reorderPoint ?? 0);
    if (currentStock <= reorderPoint) {
      await db.insert(alerts).values({
        barAccountId: actor.barAccountId,
        type: "low_stock",
        severity: currentStock === 0 ? "critical" : "warning",
        status: "open",
        title: `GET MORE ${product.name}`,
        message: `Current stock: ${currentStock}. Reorder point: ${reorderPoint}.`,
      }).onConflictDoNothing();
    }
  }

  return c.json({ adjustment, item });
});

app.get("/inventory/purchase-orders", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const orders = await db
    .select({
      id: purchaseOrders.id,
      orderNumber: purchaseOrders.orderNumber,
      status: purchaseOrders.status,
      supplierName: suppliers.name,
      totalCost: purchaseOrders.totalCost,
      orderedAt: purchaseOrders.orderedAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(
      eq(purchaseOrders.barAccountId, actor.barAccountId),
      inArray(purchaseOrders.status, ["submitted", "partially_received"])
    ))
    .orderBy(desc(purchaseOrders.orderedAt));

  return c.json({ orders });
});

app.post("/inventory/receive", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const body = receiveStockSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  const { mode, purchaseOrderId, lines, notes } = body.data;

  for (const line of lines) {
    const [item] = await db
      .update(inventoryItems)
      .set({ quantityOnHand: sql`${inventoryItems.quantityOnHand} + ${String(line.quantityReceived)}` })
      .where(and(eq(inventoryItems.barAccountId, actor.barAccountId), eq(inventoryItems.productId, line.productId)))
      .returning();

    if (!item) continue;

    await db.insert(stockAdjustments).values({
      barAccountId: actor.barAccountId,
      productId: line.productId,
      inventoryLocationId: item.inventoryLocationId,
      managerId: actor.actorId as any,
      adjustmentType: "receiving",
      quantityDelta: String(line.quantityReceived),
      reason: mode === "po" ? `Received from PO ${purchaseOrderId ?? ""}` : "Direct receipt",
      notes,
    });
  }

  if (mode === "po" && purchaseOrderId) {
    const poLines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId));
    for (const line of lines) {
      const poLine = poLines.find((pl) => pl.productId === line.productId);
      if (poLine) {
        const newReceived = (Number(poLine.quantityReceived) || 0) + line.quantityReceived;
        await db.update(purchaseOrderLines).set({ quantityReceived: String(newReceived) }).where(eq(purchaseOrderLines.id, poLine.id));
      }
    }
    // Update PO status if all lines fully received
    const updatedLines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.purchaseOrderId, purchaseOrderId));
    const allReceived = updatedLines.every((l) => Number(l.quantityReceived) >= Number(l.quantityOrdered));
    await db.update(purchaseOrders).set({ status: allReceived ? "received" : "partially_received", receivedAt: allReceived ? new Date() : undefined }).where(eq(purchaseOrders.id, purchaseOrderId));
  }

  await audit(actor, "stock_received", "purchase_orders", purchaseOrderId ?? "free", { lines, mode });
  return c.json({ ok: true });
});

app.get("/inventory/history", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");
  const type = c.req.query("type");
  const limit = Math.min(100, Number(c.req.query("limit") || "50"));
  const offset = Number(c.req.query("offset") || "0");

  const conditions = [eq(stockAdjustments.barAccountId, actor.barAccountId)];
  if (type) conditions.push(eq(stockAdjustments.adjustmentType, type as any));

  const adjustments = await db
    .select({
      id: stockAdjustments.id,
      productId: stockAdjustments.productId,
      adjustmentType: stockAdjustments.adjustmentType,
      quantityDelta: stockAdjustments.quantityDelta,
      reason: stockAdjustments.reason,
      notes: stockAdjustments.notes,
      createdAt: stockAdjustments.createdAt,
      productName: products.name,
    })
    .from(stockAdjustments)
    .innerJoin(products, eq(stockAdjustments.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(stockAdjustments.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ adjustments });
});

const aiReportRequestSchema = z.object({
  barNightId: uuidSchema.optional(),
});

const aiReportActionItemSchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
  title: z.string().min(1),
  detail: z.string().min(1),
});

const aiReportContentSchema = z.object({
  title: z.string().min(1),
  executiveSummary: z.string().min(1),
  keyInsights: z.array(z.string()).default([]),
  actionItems: z.array(aiReportActionItemSchema).default([]),
  restockRecommendations: z.array(z.string()).default([]),
  overpourRisks: z.array(z.string()).default([]),
  markdown: z.string().min(1),
});

type AiReportContent = z.infer<typeof aiReportContentSchema>;

function isoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "ontap-ai-report";
}

function serializeAiReport(row: typeof aiReports.$inferSelect) {
  return {
    id: row.id,
    barAccountId: row.barAccountId,
    barNightId: row.barNightId,
    generatedByManagerId: row.generatedByManagerId,
    provider: row.provider,
    model: row.model,
    status: row.status,
    title: row.title,
    executiveSummary: row.executiveSummary,
    reportJson: row.reportJson,
    markdown: row.markdown,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function resolveReportNight(actor: ActorSession, barNightId?: string) {
  if (barNightId && !uuidSchema.safeParse(barNightId).success) {
    throw new Error("Invalid night id");
  }

  if (barNightId) {
    const [night] = await db
      .select()
      .from(barNights)
      .where(and(eq(barNights.id, barNightId), eq(barNights.barAccountId, actor.barAccountId)))
      .limit(1);
    if (!night) throw new Error("Night not found");
    return night;
  }

  const activeNight = await getOrCreateActiveNight(actor.barAccountId, actor.actorId);
  const [night] = await db
    .select()
    .from(barNights)
    .where(and(eq(barNights.id, activeNight.id), eq(barNights.barAccountId, actor.barAccountId)))
    .limit(1);
  if (!night) throw new Error("Night not found");
  return night;
}

async function buildAiReportSourceData(actor: ActorSession, barNightId?: string) {
  const night = await resolveReportNight(actor, barNightId);
  const [barAccount] = await db
    .select({ name: barAccounts.name })
    .from(barAccounts)
    .where(eq(barAccounts.id, actor.barAccountId))
    .limit(1);

  const inventory = shapeCategoryDashboard(await currentInventoryRows(actor.barAccountId));

  const usageByProductRows = await db
    .select({
      productId: usageLogs.productId,
      productName: products.name,
      categoryId: usageLogs.categoryId,
      categoryName: inventoryCategories.name,
      quantityUsed: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
    })
    .from(usageLogs)
    .leftJoin(products, eq(usageLogs.productId, products.id))
    .leftJoin(inventoryCategories, eq(usageLogs.categoryId, inventoryCategories.id))
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(
      usageLogs.productId,
      usageLogs.categoryId,
      products.name,
      inventoryCategories.name
    );

  const usageByCategoryRows = await db
    .select({
      categoryId: usageLogs.categoryId,
      categoryName: inventoryCategories.name,
      bottlesLogged: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
    })
    .from(usageLogs)
    .leftJoin(inventoryCategories, eq(usageLogs.categoryId, inventoryCategories.id))
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(usageLogs.categoryId, inventoryCategories.name);

  const posRows = await db
    .select({
      categoryId: posEstimates.categoryId,
      categoryName: inventoryCategories.name,
      productId: posEstimates.productId,
      productName: products.name,
      drinkCount: posEstimates.drinkCount,
      grossSales: posEstimates.grossSales,
      source: posEstimates.source,
      notes: posEstimates.notes,
      createdAt: posEstimates.createdAt,
    })
    .from(posEstimates)
    .leftJoin(inventoryCategories, eq(posEstimates.categoryId, inventoryCategories.id))
    .leftJoin(products, eq(posEstimates.productId, products.id))
    .where(and(eq(posEstimates.barAccountId, actor.barAccountId), eq(posEstimates.barNightId, night.id)))
    .orderBy(desc(posEstimates.createdAt));

  const alertRows = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      severity: alerts.severity,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      triggeredAt: alerts.triggeredAt,
      categoryName: inventoryCategories.name,
      productName: products.name,
    })
    .from(alerts)
    .leftJoin(inventoryCategories, eq(alerts.categoryId, inventoryCategories.id))
    .leftJoin(products, eq(alerts.productId, products.id))
    .where(and(eq(alerts.barAccountId, actor.barAccountId), eq(alerts.barNightId, night.id)))
    .orderBy(desc(alerts.triggeredAt));

  const staffRows = await db
    .select({
      staffName: staffMembers.name,
      status: staffShifts.status,
      startedAt: staffShifts.startedAt,
      endedAt: staffShifts.endedAt,
    })
    .from(staffShifts)
    .innerJoin(staffMembers, eq(staffShifts.staffMemberId, staffMembers.id))
    .where(and(eq(staffShifts.barAccountId, actor.barAccountId), eq(staffShifts.barNightId, night.id)))
    .orderBy(staffShifts.startedAt);

  const usageByCategory = usageByCategoryRows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? "Uncategorized",
    bottlesLogged: Number(row.bottlesLogged ?? 0),
  }));

  const posByCategory = new Map<
    string,
    { categoryId: string; categoryName: string; posDrinkCount: number; grossSales: number }
  >();
  for (const row of posRows) {
    if (!row.categoryId) continue;
    const existing = posByCategory.get(row.categoryId) ?? {
      categoryId: row.categoryId,
      categoryName: row.categoryName ?? "Uncategorized",
      posDrinkCount: 0,
      grossSales: 0,
    };
    existing.posDrinkCount += Number(row.drinkCount ?? 0);
    existing.grossSales += Number(row.grossSales ?? 0);
    posByCategory.set(row.categoryId, existing);
  }

  const usageByCategoryMap = new Map(
    usageByCategory
      .filter((row) => row.categoryId)
      .map((row) => [row.categoryId!, row])
  );

  const variance = [];
  const varianceCategoryIds = new Set([
    ...usageByCategoryMap.keys(),
    ...posByCategory.keys(),
  ]);
  for (const categoryId of varianceCategoryIds) {
    const usage = usageByCategoryMap.get(categoryId);
    const pos = posByCategory.get(categoryId);
    const bottlesLogged = usage?.bottlesLogged ?? 0;
    const posDrinkCount = pos?.posDrinkCount ?? 0;
    if (bottlesLogged === 0 && posDrinkCount === 0) continue;

    let severity: "high" | "low" | "missing_pos" | null = null;
    const ratio = posDrinkCount === 0 ? Infinity : bottlesLogged / posDrinkCount;
    if (posDrinkCount === 0 && bottlesLogged > 0) severity = "missing_pos";
    else if (ratio > 1.5) severity = "high";
    else if (ratio < 0.7) severity = "low";

    if (!severity) continue;
    variance.push({
      categoryId,
      categoryName: usage?.categoryName ?? pos?.categoryName ?? "Uncategorized",
      bottlesLogged,
      posDrinkCount,
      ratio: Number.isFinite(ratio) ? Math.round(ratio * 100) / 100 : null,
      discrepancyBottles: bottlesLogged - posDrinkCount,
      severity,
    });
  }

  const inventorySnapshot = inventory.map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    type: category.type,
    currentStock: category.currentStock,
    fullStock: category.parLevel,
    products: category.products.map((product) => ({
      productId: product.id,
      productName: product.name,
      currentStock: product.currentStock,
      fullStock: product.parLevel,
      reorderPoint: product.reorderPoint,
      unitType: product.unitType,
    })),
  }));

  const restockCandidates = inventorySnapshot.flatMap((category) =>
    category.products
      .filter((product) => product.currentStock < product.fullStock)
      .map((product) => ({
        categoryName: category.categoryName,
        productName: product.productName,
        currentStock: product.currentStock,
        fullStock: product.fullStock,
        gap: Math.max(0, product.fullStock - product.currentStock),
        unitType: product.unitType,
      }))
  );

  const usageByProduct = usageByProductRows.map((row) => ({
    productId: row.productId,
    productName: row.productName ?? "Unknown",
    categoryId: row.categoryId,
    categoryName: row.categoryName ?? "Uncategorized",
    quantityUsed: Number(row.quantityUsed ?? 0),
  }));

  const posEstimatesForReport = posRows.map((row) => ({
    categoryName: row.categoryName ?? "Uncategorized",
    productName: row.productName ?? null,
    drinkCount: Number(row.drinkCount ?? 0),
    grossSales: row.grossSales ? Number(row.grossSales) : null,
    source: row.source,
    notes: row.notes,
    createdAt: isoDate(row.createdAt),
  }));

  const alertData = alertRows.map((row) => ({
    type: row.type,
    severity: row.severity,
    status: row.status,
    title: row.title,
    message: row.message,
    categoryName: row.categoryName ?? "General",
    productName: row.productName ?? null,
    triggeredAt: isoDate(row.triggeredAt),
  }));

  const totalBottlesLogged = usageByProduct.reduce((sum, row) => sum + row.quantityUsed, 0);
  const totalPosDrinks = posEstimatesForReport.reduce((sum, row) => sum + row.drinkCount, 0);
  const totalGrossSales = posEstimatesForReport.reduce((sum, row) => sum + (row.grossSales ?? 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    bar: { id: actor.barAccountId, name: barAccount?.name ?? "Bar" },
    manager: { id: actor.actorId, name: actor.name },
    night: {
      id: night.id,
      businessDate: night.businessDate,
      status: night.status,
      openedAt: isoDate(night.openedAt),
      closedAt: isoDate(night.closedAt),
    },
    summary: {
      totalBottlesLogged,
      totalPosDrinks,
      totalGrossSales,
      alertCount: alertData.length,
      criticalAlertCount: alertData.filter((alert) => alert.severity === "critical").length,
      openAlertCount: alertData.filter((alert) => alert.status === "open").length,
      staffOnDutyCount: staffRows.length,
    },
    staffOnDuty: staffRows.map((row) => ({
      name: row.staffName,
      status: row.status,
      startedAt: isoDate(row.startedAt),
      endedAt: isoDate(row.endedAt),
    })),
    usageByCategory,
    usageByProduct,
    posByCategory: Array.from(posByCategory.values()),
    posEstimates: posEstimatesForReport,
    variance,
    alerts: alertData,
    inventorySnapshot,
    restockCandidates,
  };
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error("AI response did not contain valid JSON");
  }
}

async function generateAiReportContent(sourceData: Record<string, unknown>) {
  const apiKey = process.env.TERACAST_API_KEY;
  if (!apiKey) throw new Error("TERACAST_API_KEY is not configured");

  const endpoint =
    process.env.TERACAST_CHAT_COMPLETIONS_URL ??
    "https://inference.teracast.net/v1/chat/completions";
  const model = process.env.TERACAST_MODEL ?? "moonshotai/kimi-k2.6";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are OnTap's bar operations analyst. Use only the supplied data. Return strict JSON with this shape: {title, executiveSummary, keyInsights, actionItems, restockRecommendations, overpourRisks, markdown}. Keep recommendations direct, practical, and manager-ready. Do not invent facts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Generate an actionable end-of-night manager report. Prioritize restock gaps, overpour/variance risks, alert patterns, and immediate next-shift actions.",
            sourceData,
          }),
        },
      ],
    }),
  });

  const raw = await response.text();
  const parsedBody = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    const message =
      parsedBody?.error?.message ??
      parsedBody?.message ??
      `Teracast request failed with status ${response.status}`;
    throw new Error(String(message));
  }

  const messageContent = parsedBody?.choices?.[0]?.message?.content;
  if (typeof messageContent !== "string") {
    throw new Error("Teracast returned an empty report response");
  }

  const content = aiReportContentSchema.parse(extractJsonObject(messageContent));
  return { model, content };
}

async function getOwnedAiReport(actor: ActorSession, reportId: string) {
  if (!uuidSchema.safeParse(reportId).success) return null;
  const [report] = await db
    .select()
    .from(aiReports)
    .where(and(eq(aiReports.id, reportId), eq(aiReports.barAccountId, actor.barAccountId)))
    .limit(1);
  return report ?? null;
}

app.post("/boss/ai-reports", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const body = aiReportRequestSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: body.error.flatten() }, 400);

  let sourceData: Awaited<ReturnType<typeof buildAiReportSourceData>>;
  try {
    sourceData = await buildAiReportSourceData(actor, body.data.barNightId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load report data";
    return jsonError(c, message === "Night not found" ? 404 : 400, message);
  }

  try {
    const { model, content } = await generateAiReportContent(sourceData as Record<string, unknown>);
    const [report] = await db
      .insert(aiReports)
      .values({
        barAccountId: actor.barAccountId,
        barNightId: sourceData.night.id,
        generatedByManagerId: actor.actorId,
        provider: "teracast",
        model,
        status: "completed",
        title: content.title,
        executiveSummary: content.executiveSummary,
        reportJson: content,
        markdown: content.markdown,
        sourceDataJson: sourceData as Record<string, unknown>,
      })
      .returning();

    await audit(actor, "ai_report_generated", "ai_report", report.id, {
      barNightId: sourceData.night.id,
      model,
    });

    return c.json({ report: serializeAiReport(report) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI report generation failed";
    const [failedReport] = await db
      .insert(aiReports)
      .values({
        barAccountId: actor.barAccountId,
        barNightId: sourceData.night.id,
        generatedByManagerId: actor.actorId,
        provider: "teracast",
        model: process.env.TERACAST_MODEL ?? "moonshotai/kimi-k2.6",
        status: "failed",
        title: `AI report failed for ${sourceData.night.businessDate}`,
        executiveSummary: null,
        reportJson: null,
        markdown: null,
        sourceDataJson: sourceData as Record<string, unknown>,
        errorMessage: message,
      })
      .returning();

    await audit(actor, "ai_report_failed", "ai_report", failedReport.id, {
      barNightId: sourceData.night.id,
      errorMessage: message,
    });

    return c.json({ error: message, report: serializeAiReport(failedReport) }, 502);
  }
});

app.get("/boss/ai-reports", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const barNightId = c.req.query("barNightId");
  if (barNightId && !uuidSchema.safeParse(barNightId).success) {
    return jsonError(c, 400, "Invalid night id");
  }

  const where = barNightId
    ? and(eq(aiReports.barAccountId, actor.barAccountId), eq(aiReports.barNightId, barNightId))
    : eq(aiReports.barAccountId, actor.barAccountId);

  const reports = await db
    .select()
    .from(aiReports)
    .where(where)
    .orderBy(desc(aiReports.createdAt))
    .limit(50);

  return c.json({ reports: reports.map(serializeAiReport) });
});

app.get("/boss/ai-reports/:id/download", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const report = await getOwnedAiReport(actor, c.req.param("id"));
  if (!report) return jsonError(c, 404, "AI report not found");
  if (!report.markdown) return jsonError(c, 404, "AI report has no downloadable markdown");

  c.header("Content-Type", "text/markdown; charset=utf-8");
  c.header(
    "Content-Disposition",
    `attachment; filename="${safeFilename(report.title)}.md"`
  );
  return c.body(report.markdown);
});

app.get("/boss/ai-reports/:id", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const report = await getOwnedAiReport(actor, c.req.param("id"));
  if (!report) return jsonError(c, 404, "AI report not found");
  return c.json({ report: serializeAiReport(report) });
});

app.get("/boss/report-summary", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const barNightId = c.req.query("barNightId");
  let night;

  if (barNightId) {
    [night] = await db
      .select()
      .from(barNights)
      .where(and(eq(barNights.id, barNightId), eq(barNights.barAccountId, actor.barAccountId)))
      .limit(1);
    if (!night) return jsonError(c, 404, "Night not found");
  } else {
    const businessDate = new Date().toISOString().slice(0, 10);
    [night] = await db
      .select()
      .from(barNights)
      .where(and(eq(barNights.barAccountId, actor.barAccountId), eq(barNights.businessDate, businessDate)))
      .limit(1);
    if (!night) return jsonError(c, 404, "No active night found for today");
  }

  const rows = await currentInventoryRows(actor.barAccountId);

  const usageAgg = await db
    .select({
      productId: usageLogs.productId,
      quantityUsed: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(usageLogs.productId);

  const alertAgg = await db
    .select({
      productId: alerts.productId,
      alertCount: sql<number>`count(*)`,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.barAccountId, actor.barAccountId),
        eq(alerts.barNightId, night.id)
      )
    )
    .groupBy(alerts.productId);

  const usageMap = new Map(usageAgg.map((u) => [u.productId, Number(u.quantityUsed)]));
  const alertMap = new Map(alertAgg.map((a) => [a.productId, Number(a.alertCount)]));

  let totalStartingStock = 0;
  let totalEndingStock = 0;
  let totalConsumed = 0;
  let totalAlerts = 0;

  const spiritLines = [];
  for (const row of rows) {
    if (!row.productId) continue;
    const consumed = usageMap.get(row.productId) ?? 0;
    const endingStock = Number(row.quantityOnHand ?? 0);
    const startingStock = endingStock + consumed;
    const alertCount = alertMap.get(row.productId) ?? 0;

    totalStartingStock += startingStock;
    totalEndingStock += endingStock;
    totalConsumed += consumed;
    totalAlerts += alertCount;

    spiritLines.push({
      productId: row.productId,
      productName: row.productName ?? "Unnamed product",
      categoryName: row.categoryName ?? "Uncategorized",
      startingStock,
      consumed,
      endingStock,
      unitType: row.unitType ?? "each",
      alertCount,
    });
  }

  return c.json({
    barNight: { id: night.id, businessDate: night.businessDate, status: night.status },
    summary: {
      totalStartingStock,
      totalEndingStock,
      totalConsumed,
      totalAlerts,
    },
    spiritLines,
  });
});

app.get("/boss/report-variance", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const barNightId = c.req.query("barNightId");
  let night;

  if (barNightId) {
    [night] = await db
      .select()
      .from(barNights)
      .where(and(eq(barNights.id, barNightId), eq(barNights.barAccountId, actor.barAccountId)))
      .limit(1);
    if (!night) return jsonError(c, 404, "Night not found");
  } else {
    const businessDate = new Date().toISOString().slice(0, 10);
    [night] = await db
      .select()
      .from(barNights)
      .where(and(eq(barNights.barAccountId, actor.barAccountId), eq(barNights.businessDate, businessDate)))
      .limit(1);
    if (!night) return jsonError(c, 404, "No active night found for today");
  }

  const usageAgg = await db
    .select({
      categoryId: usageLogs.categoryId,
      bottlesLogged: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, night.id),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(usageLogs.categoryId);

  const posAgg = await db
    .select({
      categoryId: posEstimates.categoryId,
      posDrinkCount: sql<string>`COALESCE(SUM(${posEstimates.drinkCount}), 0)`,
    })
    .from(posEstimates)
    .where(
      and(
        eq(posEstimates.barAccountId, actor.barAccountId),
        eq(posEstimates.barNightId, night.id)
      )
    )
    .groupBy(posEstimates.categoryId);

  const staffRows = await db
    .select({ name: staffMembers.name })
    .from(staffShifts)
    .innerJoin(staffMembers, eq(staffShifts.staffMemberId, staffMembers.id))
    .where(
      and(
        eq(staffShifts.barAccountId, actor.barAccountId),
        eq(staffShifts.barNightId, night.id)
      )
    );

  const staffOnDuty = [...new Set(staffRows.map((s) => s.name))];

  const categories = await db
    .select({ id: inventoryCategories.id, name: inventoryCategories.name })
    .from(inventoryCategories)
    .where(eq(inventoryCategories.barAccountId, actor.barAccountId));

  const usageMap = new Map(usageAgg.map((u) => [u.categoryId, Number(u.bottlesLogged)]));
  const posMap = new Map(posAgg.map((p) => [p.categoryId, Number(p.posDrinkCount)]));

  const categoryIds = new Set([
    ...usageAgg.map((u) => u.categoryId).filter((id): id is string => !!id),
    ...posAgg.map((p) => p.categoryId).filter((id): id is string => !!id),
  ]);

  const discrepancies = [];
  for (const categoryId of categoryIds) {
    const bottlesLogged = usageMap.get(categoryId) ?? 0;
    const posDrinkCount = posMap.get(categoryId) ?? 0;

    if (posDrinkCount === 0 && bottlesLogged === 0) continue;

    let ratio: number;
    let severity: "high" | "low" | "missing_pos";

    if (posDrinkCount === 0 && bottlesLogged > 0) {
      ratio = Infinity;
      severity = "missing_pos";
    } else {
      ratio = bottlesLogged / posDrinkCount;
      if (ratio > 1.5) severity = "high";
      else if (ratio < 0.7) severity = "low";
      else continue;
    }

    const category = categories.find((cat) => cat.id === categoryId);

    discrepancies.push({
      categoryId,
      categoryName: category?.name ?? "Unknown",
      bottlesLogged,
      posDrinkCount,
      ratio,
      discrepancyBottles: bottlesLogged - posDrinkCount,
      severity,
      staffOnDuty,
    });
  }

  return c.json({ discrepancies });
});

app.get("/boss/report-reorders", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return jsonError(c, 401, "Manager session required");

  const rows = await currentInventoryRows(actor.barAccountId);

  const eligibleRows = [];
  const eligibleProductIds: string[] = [];
  for (const row of rows) {
    if (!row.productId) continue;
    const currentStock = Number(row.quantityOnHand ?? 0);
    const parLevel = Number(row.parLevel ?? 0);
    if (currentStock < parLevel) {
      eligibleRows.push(row);
      eligibleProductIds.push(row.productId);
    }
  }

  const productDetails = eligibleProductIds.length
    ? await db
        .select({
          id: products.id,
          costPerUnit: products.costPerUnit,
          supplierId: products.supplierId,
        })
        .from(products)
        .where(
          and(
            eq(products.barAccountId, actor.barAccountId),
            inArray(products.id, eligibleProductIds)
          )
        )
    : [];

  const supplierIds = [
    ...new Set(productDetails.map((p) => p.supplierId).filter((id): id is string => !!id)),
  ];

  const supplierDetails = supplierIds.length
    ? await db
        .select({ id: suppliers.id, name: suppliers.name })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.barAccountId, actor.barAccountId),
            inArray(suppliers.id, supplierIds)
          )
        )
    : [];

  // Compute 14-day average usage from usage logs
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const usageHistory = await db
    .select({
      productId: usageLogs.productId,
      totalUsed: sql<string>`COALESCE(SUM(${usageLogs.quantityUsed}), 0)`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        gte(usageLogs.occurredAt, fourteenDaysAgo),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(usageLogs.productId);
  const usageHistoryMap = new Map(usageHistory.map((u) => [u.productId, Number(u.totalUsed)]));

  const reorderLines = eligibleRows.map((row) => {
    const detail = productDetails.find((p) => p.id === row.productId) ?? null;
    const supplier = supplierDetails.find((s) => s.id === detail?.supplierId) ?? null;
    const currentStock = Number(row.quantityOnHand ?? 0);
    const parLevel = Number(row.parLevel ?? 0);
    const gap = parLevel - currentStock;
    const avg14DayUsage = usageHistoryMap.get(row.productId!) ?? 0;
    const avgDaily = avg14DayUsage / 14;
    let trend: "increase" | "decrease" | "maintain" = "maintain";
    if (avgDaily > (parLevel / 7)) trend = "increase";
    else if (avgDaily < (parLevel / 14)) trend = "decrease";

    return {
      productId: row.productId!,
      productName: row.productName ?? "Unnamed",
      brand: row.brand ?? null,
      categoryName: row.categoryName ?? "Uncategorized",
      currentStock,
      parLevel,
      gap,
      avg14DayUsage,
      trend,
      recommendedQuantity: Math.max(gap, 0),
      unitCost: detail?.costPerUnit ? Number(detail.costPerUnit) : null,
      supplierName: supplier?.name ?? null,
    };
  });

  return c.json({ reorderLines });
});

app.post("/boss/close-night", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return c.json({ error: "Unauthorized" }, 401);

  const activeNight = await getOrCreateActiveNight(actor.barAccountId);

  await db
    .update(barNights)
    .set({
      status: "closed",
      closedByManagerId: actor.actorId,
      closedAt: new Date(),
    })
    .where(eq(barNights.id, activeNight.id));

  await db
    .update(staffShifts)
    .set({ status: "ended", endedAt: new Date() })
    .where(
      and(
        eq(staffShifts.barNightId, activeNight.id),
        eq(staffShifts.status, "active")
      )
    );

  /* ── Reset inventory to fullStock minus bottles used this night ── */
  const usageByProduct = await db
    .select({
      productId: usageLogs.productId,
      totalUsed: sql<number>`sum(${usageLogs.quantityUsed})`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, activeNight.id),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(usageLogs.productId);

  const usageMap = new Map(
    usageByProduct.map((u) => [u.productId, Number(u.totalUsed ?? 0)])
  );

  const inventoryRows = await db
    .select({
      itemId: inventoryItems.id,
      productId: inventoryItems.productId,
      parLevel: products.parLevel,
    })
    .from(inventoryItems)
    .innerJoin(products, eq(inventoryItems.productId, products.id))
    .where(eq(inventoryItems.barAccountId, actor.barAccountId));

  for (const item of inventoryRows) {
    const totalUsed = usageMap.get(item.productId) ?? 0;
    const parLevel = Number(item.parLevel ?? 0);
    const newStock = Math.max(0, parLevel - totalUsed);
    await db
      .update(inventoryItems)
      .set({ quantityOnHand: String(newStock), updatedAt: new Date() })
      .where(eq(inventoryItems.id, item.itemId));
  }

  await audit(actor, "close_night", "bar_night", activeNight.id);

  return c.json({ success: true, night: activeNight });
});

app.get("/boss/export/:nightId", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return c.json({ error: "Unauthorized" }, 401);
  const nightId = c.req.param("nightId");
  if (!uuidSchema.safeParse(nightId).success) {
    return jsonError(c, 400, "Invalid night id");
  }

  const [night] = await db
    .select({ id: barNights.id })
    .from(barNights)
    .where(and(eq(barNights.id, nightId), eq(barNights.barAccountId, actor.barAccountId)))
    .limit(1);

  if (!night) return jsonError(c, 404, "Night not found");

  const usageLogRows = await db.query.usageLogs.findMany({
    where: and(eq(usageLogs.barNightId, nightId), eq(usageLogs.barAccountId, actor.barAccountId)),
    with: { product: true },
  });

  const alertRows = await db.query.alerts.findMany({
    where: and(eq(alerts.barNightId, nightId), eq(alerts.barAccountId, actor.barAccountId)),
  });

  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [
    "Product,Quantity Used,Time",
    ...usageLogRows.map(
      (u) =>
        [csvCell(u.product?.name || "Unknown"), u.quantityUsed, csvCell(u.createdAt)].join(",")
    ),
    "",
    "Alert Type,Message,Severity",
    ...alertRows.map(
      (a) => [csvCell(a.type), csvCell(a.message), csvCell(a.severity)].join(",")
    ),
  ];

  const csv = lines.join("\n");

  c.header("Content-Type", "text/csv");
  c.header(
    "Content-Disposition",
    `attachment; filename="ontap-night-${nightId}.csv"`
  );
  return c.body(csv);
});

app.get("/boss/night-recommendations/:nightId", async (c) => {
  const actor = await requireActor(c, "manager");
  if (!actor) return c.json({ error: "Unauthorized" }, 401);

  const nightId = c.req.param("nightId");
  if (!uuidSchema.safeParse(nightId).success) {
    return jsonError(c, 400, "Invalid night id");
  }

  const [night] = await db
    .select({ id: barNights.id })
    .from(barNights)
    .where(and(eq(barNights.id, nightId), eq(barNights.barAccountId, actor.barAccountId)))
    .limit(1);

  if (!night) return jsonError(c, 404, "Night not found");

  /* ── Get usage per category for this night ── */
  const usageRows = await db
    .select({
      categoryId: products.categoryId,
      totalUsed: sql<number>`sum(${usageLogs.quantityUsed})`,
    })
    .from(usageLogs)
    .innerJoin(products, eq(usageLogs.productId, products.id))
    .where(
      and(
        eq(usageLogs.barAccountId, actor.barAccountId),
        eq(usageLogs.barNightId, nightId),
        isNull(usageLogs.reversedAt)
      )
    )
    .groupBy(products.categoryId);

  const usageMap = new Map<string, number>();
  for (const row of usageRows) {
    if (row.categoryId) usageMap.set(row.categoryId, Number(row.totalUsed ?? 0));
  }

  /* ── Get full stock (parLevel) per category ── */
  const stockRows = await db
    .select({
      categoryId: products.categoryId,
      fullStock: sql<number>`sum(${products.parLevel})`,
    })
    .from(products)
    .where(and(eq(products.barAccountId, actor.barAccountId), eq(products.isActive, true)))
    .groupBy(products.categoryId);

  const stockMap = new Map<string, number>();
  for (const row of stockRows) {
    if (row.categoryId) stockMap.set(row.categoryId, Number(row.fullStock ?? 0));
  }

  /* ── Get category names ── */
  const categoryRows = await db
    .select({ id: inventoryCategories.id, name: inventoryCategories.name })
    .from(inventoryCategories)
    .where(eq(inventoryCategories.barAccountId, actor.barAccountId));

  const categoryMap = new Map<string, string>();
  for (const row of categoryRows) {
    categoryMap.set(row.id, row.name);
  }

  /* ── Build recommendations ── */
  const allCategoryIds = new Set([...stockMap.keys(), ...usageMap.keys()]);
  const recommendations = [];

  for (const categoryId of allCategoryIds) {
    const fullStock = stockMap.get(categoryId) ?? 0;
    if (fullStock <= 0) continue;

    const totalUsed = usageMap.get(categoryId) ?? 0;
    const pctUsed = fullStock > 0 ? (totalUsed / fullStock) * 100 : 0;
    const unused = Math.max(0, fullStock - totalUsed);
    const overPct = Math.max(0, pctUsed - 100);

    let status: "over_ordered" | "balanced" | "ran_low";
    let message: string;

    if (pctUsed < 50) {
      status = "over_ordered";
      const fewer = Math.ceil(unused);
      message = `Order ${fewer} fewer bottle${fewer === 1 ? "" : "s"} next time — ${Math.round(100 - pctUsed)}% of stock went unused.`;
    } else if (pctUsed <= 80) {
      status = "balanced";
      message = "Your order was well balanced — no change needed.";
    } else {
      status = "ran_low";
      const extra = Math.ceil(Math.max(0, totalUsed - fullStock));
      const shortagePct = Math.round(pctUsed - 100);
      if (extra > 0 && shortagePct > 0) {
        message = `You ran low — order ${extra} more bottle${extra === 1 ? "" : "s"} next time (${shortagePct}% over par).`;
      } else {
        message = `You ran low — consider ordering more next time (${Math.round(pctUsed)}% of par used).`;
      }
    }

    recommendations.push({
      categoryId,
      categoryName: categoryMap.get(categoryId) ?? "Unknown",
      totalUsed,
      fullStock,
      pctUsed: Math.round(pctUsed * 10) / 10,
      status,
      message,
    });
  }

  recommendations.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return c.json({ recommendations, note: "Based on tonight's usage." });
});

app.post("/login/manager/reset", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = body?.email;
  if (!email || typeof email !== "string") {
    return c.json({ error: "Email is required" }, 400);
  }
  // Stub: always return success. Real email integration is Phase 2.
  return c.json({ sent: true });
});

export { app as onTapRoutes };
