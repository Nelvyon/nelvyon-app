/**
 * In-process OpenClaw mock dispatch server for contract / failure / latency tests.
 * Does not require an external OpenClaw URL.
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { OPENCLAW_ADAPTER_CONTRACT } from "./contracts";

export type OpenClawMockOptions = {
  /** Artificial delay ms */
  latencyMs?: number;
  /** Force HTTP error status on every dispatch */
  failStatus?: number;
  /** Reject oversized payloads */
  enforceMaxPayload?: boolean;
  /**
   * Fail the first N dispatch calls with `failStatus` (default 500), then succeed.
   * Used for failure-injection + recovery drills — distinct from `failStatus` which
   * fails every call.
   */
  failFirstN?: number;
};

export type OpenClawMockHandle = {
  url: string;
  port: number;
  close: () => Promise<void>;
  stats: () => { dispatches: number; lastCorrelationId: string | null };
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export async function startOpenClawMockServer(
  opts: OpenClawMockOptions = {},
): Promise<OpenClawMockHandle> {
  let dispatches = 0;
  let lastCorrelationId: string | null = null;
  let failedSoFar = 0;
  const latencyMs = opts.latencyMs ?? 0;
  const enforceMaxPayload = opts.enforceMaxPayload !== false;

  const server: Server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "openclaw-mock", version: "1.0.0" }));
      return;
    }

    if (req.method === "POST" && (req.url === "/v1/dispatch" || req.url?.startsWith("/v1/dispatch"))) {
      try {
        if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs));
        if (opts.failStatus) {
          res.writeHead(opts.failStatus, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: `forced_${opts.failStatus}` }));
          return;
        }
        if (opts.failFirstN && failedSoFar < opts.failFirstN) {
          failedSoFar += 1;
          const status = opts.failStatus ?? 500;
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: `failure_injection_${failedSoFar}_of_${opts.failFirstN}` }));
          return;
        }

        const raw = await readBody(req);
        if (
          enforceMaxPayload &&
          Buffer.byteLength(raw, "utf8") > OPENCLAW_ADAPTER_CONTRACT.security.maxPayloadBytes
        ) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "payload_too_large" }));
          return;
        }

        const body = JSON.parse(raw || "{}") as {
          agentId?: string;
          tenantId?: string;
          input?: string;
          tools?: string[];
          correlationId?: string;
        };

        if (!body.tenantId?.trim()) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "tenant_required" }));
          return;
        }

        dispatches += 1;
        lastCorrelationId = body.correlationId ?? `mock-${dispatches}`;
        const forbidden = new Set(OPENCLAW_ADAPTER_CONTRACT.security.forbiddenTools);
        const tools = (body.tools ?? []).filter((t) => !forbidden.has(t));

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            output: `mock_dispatch agent=${body.agentId} tenant=${body.tenantId} tools=${tools.length}`,
            correlationId: lastCorrelationId,
          }),
        );
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            error: e instanceof Error ? e.message : "mock_error",
          }),
        );
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("openclaw_mock_bind_failed");
  const port = addr.port;
  const url = `http://127.0.0.1:${port}`;

  return {
    url,
    port,
    stats: () => ({ dispatches, lastCorrelationId }),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** Pure handler for unit tests without binding a port. */
export function handleOpenClawMockDispatch(
  body: { agentId?: string; tenantId?: string; input?: string; tools?: string[] },
): { status: number; payload: Record<string, unknown> } {
  if (!body.tenantId?.trim()) {
    return { status: 400, payload: { ok: false, error: "tenant_required" } };
  }
  const forbidden = new Set(OPENCLAW_ADAPTER_CONTRACT.security.forbiddenTools);
  const tools = (body.tools ?? []).filter((t) => !forbidden.has(t));
  return {
    status: 200,
    payload: {
      ok: true,
      output: `mock_dispatch agent=${body.agentId} tenant=${body.tenantId} tools=${tools.length}`,
    },
  };
}
