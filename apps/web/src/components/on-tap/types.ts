export type AppView =
  | "landing"
  | "bar-login"
  | "welcome"
  | "create"
  | "manager-login"
  | "staff-login"
  | "onboarding-cats"
  | "onboarding-stock"
  | "onboarding-staff"
  | "bartender"
  | "manager"
  | "settings";

export type AppSession = {
  type: "manager" | "staff";
  actorId: string;
  barAccountId: string;
  name: string;
  role?: string;
  staffShiftId?: string;
};

export type CreateAccountForm = {
  barName: string;
  email: string;
  password: string;
  confirmPassword: string;
  keepLoggedIn: boolean;
  managerCode: string;
};

export type LoginForm = {
  email: string;
  password: string;
};

export type ManagerSetupForm = {
  managerName: string;
  managerCode: string;
};

export type DrinkCategoryData = {
  id: string;
  name: string;
  type: string;
  items: DrinkItem[];
};

export type DrinkItem = {
  id: string;
  name: string;
  qty: number;
  selected: boolean;
};

export const defaultDrinkCategories: DrinkCategoryData[] = [
  { id: "spirits", name: "Spirits", type: "spirit", items: [] },
  { id: "beer", name: "Beer", type: "beer", items: [] },
  { id: "wine", name: "Wine", type: "wine", items: [] },
  { id: "mixers", name: "Mixers", type: "mixer", items: [] },
];
