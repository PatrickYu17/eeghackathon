import { app } from "../apps/api/src/app";

type StaffRosterResponse = { staff: Array<{ id: string; name: string }> };

const cookieJar = new Map<string, string>();

function setCookiesFrom(headers: Headers) {
  const headerWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = headerWithGetSetCookie.getSetCookie?.() ??
    (headers.get("set-cookie")?.split(/,(?=\s*[^;,]+=)/) ?? []);

  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const [name, value = ""] = pair.split("=");
    if (!name) continue;
    if (cookie.toLowerCase().includes("max-age=0") || !value) {
      cookieJar.delete(name.trim());
    } else {
      cookieJar.set(name.trim(), value.trim());
    }
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (cookieJar.size) {
    headers.set(
      "cookie",
      Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; ")
    );
  }

  const response = await app.request(path, { ...init, headers });
  setCookiesFrom(response.headers);

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${text}`);
  }
  return body as T;
}

const stamp = Date.now();
const email = `hackathon-smoke-${stamp}@example.com`;
const password = "password123";
const managerCode = "1234";

await request("/api/on-tap/account/register", {
  method: "POST",
  body: JSON.stringify({
    barName: `Smoke Test Bar ${stamp}`,
    email,
    password,
    managerCode,
    staffNames: [],
  }),
});

await request("/api/on-tap/onboarding/categories", {
  method: "POST",
  body: JSON.stringify({
    categories: [
      {
        name: "Spirits",
        type: "spirit",
        sortOrder: 0,
        products: [
          {
            name: "Vodka",
            unitType: "bottle",
            startingQuantity: 12,
            fullStockQuantity: 24,
          },
        ],
      },
      {
        name: "Custom Demo",
        type: "custom",
        sortOrder: 1,
        products: [
          {
            name: "House Syrup",
            unitType: "bottle",
            startingQuantity: 6,
            fullStockQuantity: 12,
          },
        ],
      },
    ],
  }),
});

await request("/api/on-tap/settings/staff", {
  method: "PATCH",
  body: JSON.stringify({ names: ["Alex", "Sam"], deactivateIds: [] }),
});

await request("/api/on-tap/boss/dashboard");
await request("/api/on-tap/logout", { method: "POST" });

await request("/api/on-tap/account/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

await request("/api/on-tap/login/manager", {
  method: "POST",
  body: JSON.stringify({ managerCode }),
});

// Verify staff roster works while manager is logged in (no bar context required)
const rosterWhileManager = await request<StaffRosterResponse>("/api/on-tap/staff-roster/current");
if (rosterWhileManager.staff.length < 2) {
  throw new Error(`Expected at least 2 staff members while manager logged in, found ${rosterWhileManager.staff.length}`);
}

// Clear bar context cookie and verify staff roster still works via manager session
await request("/api/on-tap/bar-context/logout", { method: "POST" });
const rosterWithoutBarContext = await request<StaffRosterResponse>("/api/on-tap/staff-roster/current");
if (rosterWithoutBarContext.staff.length < 2) {
  throw new Error(`Expected at least 2 staff members without bar context, found ${rosterWithoutBarContext.staff.length}`);
}

await request("/api/on-tap/logout", { method: "POST" });

// Re-establish bar context so the remaining flow works as originally intended
await request("/api/on-tap/account/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

const roster = await request<StaffRosterResponse>("/api/on-tap/staff-roster/current");
if (roster.staff.length < 2) {
  throw new Error(`Expected at least 2 staff members, found ${roster.staff.length}`);
}

await request("/api/on-tap/login/staff", {
  method: "POST",
  body: JSON.stringify({ staffMemberId: roster.staff[0].id }),
});
await request("/api/on-tap/bartender/dashboard");
await request("/api/on-tap/bartender/clock-out", { method: "POST" });
await request("/api/on-tap/bar-context/logout", { method: "POST" });

console.log("OnTap smoke test passed");
console.log(`Demo account: ${email}`);
console.log(`Password: ${password}`);
console.log(`Manager code: ${managerCode}`);
process.exit(0);
