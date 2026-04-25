export const accountRoles = ["owner", "manager", "staff"] as const;

export type AccountRole = (typeof accountRoles)[number];

export const permissions = [
  "products:manage",
  "suppliers:manage",
  "staff:manage",
  "settings:manage",
  "reports:view",
  "insights:view",
  "inventory_counts:write",
  "usage_logs:write",
  "waste_logs:write",
  "stock_adjustments:manage",
  "purchase_orders:manage",
  "billing:manage",
] as const;

export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<AccountRole, readonly Permission[]> = {
  owner: permissions,
  manager: [
    "products:manage",
    "suppliers:manage",
    "staff:manage",
    "settings:manage",
    "reports:view",
    "insights:view",
    "inventory_counts:write",
    "usage_logs:write",
    "waste_logs:write",
    "stock_adjustments:manage",
    "purchase_orders:manage",
  ],
  staff: ["inventory_counts:write", "usage_logs:write", "waste_logs:write"],
};

export type SessionActor = {
  barAccountId: string;
  actorId: string;
  actorType: "bar_account" | "manager" | "staff";
  role: AccountRole;
  workflowOnly?: boolean;
};

export const hasPermission = (role: AccountRole, permission: Permission) => {
  return rolePermissions[role].includes(permission);
};
