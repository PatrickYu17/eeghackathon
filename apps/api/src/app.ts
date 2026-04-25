import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { onTapRoutes } from "./on-tap";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  })
);

app.get("/health", (c) => {
  return c.body(null, 204);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.route("/api/on-tap", onTapRoutes);

export { app };
