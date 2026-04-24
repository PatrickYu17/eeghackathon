import { app } from "./app";

const port = process.env.PORT || 3001;

Bun.serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`API server running at http://localhost:${port}`);
