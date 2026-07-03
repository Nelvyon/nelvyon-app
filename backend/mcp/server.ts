#!/usr/bin/env node
/**
 * Nelvyon MCP stdio server — run: pnpm exec tsx backend/mcp/server.ts
 * Requires NELVYON_API_KEY env (nlv_...) pointing to tenant API key.
 */
import * as readline from "node:readline";

import { getNelvyonMcpService, MCP_TOOLS } from "../saas/NelvyonMcpService";
import { resolvePublicApiKey } from "../saas/requirePublicApiContext";

const API_KEY = process.env.NELVYON_API_KEY ?? "";
const BASE_URL = process.env.NELVYON_API_URL ?? "https://nelvyon.com";

async function resolveTenant(): Promise<{ tenantId: string; userId: string } | null> {
  const verified = await resolvePublicApiKey(API_KEY);
  if (!verified) return null;
  return { tenantId: verified.tenantId, userId: "mcp-stdio" };
}

function send(msg: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

async function handleRequest(line: string): Promise<void> {
  let req: { id?: number; method?: string; params?: Record<string, unknown> };
  try {
    req = JSON.parse(line) as typeof req;
  } catch {
    return;
  }

  const id = req.id ?? 0;

  if (req.method === "initialize") {
    send({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", serverInfo: { name: "nelvyon-mcp", version: "1.0.0" } } });
    return;
  }

  if (req.method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: MCP_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
    return;
  }

  if (req.method === "tools/call") {
    const ctx = await resolveTenant();
    if (!ctx) {
      send({ jsonrpc: "2.0", id, error: { code: -32001, message: "Invalid NELVYON_API_KEY" } });
      return;
    }
    const name = String((req.params as { name?: string })?.name ?? "");
    const args = ((req.params as { arguments?: Record<string, unknown> })?.arguments ?? {}) as Record<string, unknown>;
    const result = await getNelvyonMcpService().invokeTool(ctx.tenantId, ctx.userId, name, args);
    send({
      jsonrpc: "2.0",
      id,
      result: {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      },
    });
    return;
  }

  send({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
rl.on("line", (line) => {
  void handleRequest(line);
});

void BASE_URL;
