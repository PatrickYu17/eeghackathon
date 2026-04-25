import { handle } from "@hono/node-server/vercel";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Http2ServerRequest, Http2ServerResponse } from "node:http2";

type VercelRequest = IncomingMessage | Http2ServerRequest;
type VercelResponse = ServerResponse | Http2ServerResponse;

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse) {
  const origin = firstHeader(req.headers.origin);
  const requestHeaders = firstHeader(req.headers["access-control-request-headers"]);

  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin, Access-Control-Request-Headers");

  if (requestHeaders) {
    res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const { app } = await import("../src/app.js");
    return handle(app)(req, res);
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "API failed to start" }));
  }
}
