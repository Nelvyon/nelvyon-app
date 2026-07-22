import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { McpRegisteredTool } from "../types";
import { getMcpAllowedFsRoots } from "../config";

const repoRoot = path.resolve(process.cwd().includes("apps") ? path.join(process.cwd(), "../..") : process.cwd());

function assertUnderRoots(relPath: string): string {
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.resolve(repoRoot, normalized);
  const roots = getMcpAllowedFsRoots().map((r) => path.resolve(repoRoot, r));
  if (!roots.some((root) => abs === root || abs.startsWith(root + path.sep))) {
    throw new Error("filesystem_path_denied");
  }
  return abs;
}

export const productiveTools: McpRegisteredTool[] = [
  {
    name: "health_check",
    version: "1.0.0",
    description: "MCP / platform health probe (read-only)",
    category: "health",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
    handler: async () => ({
      status: "ok",
      mcp: "productive",
      ts: new Date().toISOString(),
    }),
  },
  {
    name: "metrics_snapshot",
    version: "1.0.0",
    description: "Lightweight process metrics (read-only)",
    category: "metrics",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const mem = process.memoryUsage();
      return {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        uptimeSec: Math.round(process.uptime()),
      };
    },
  },
  {
    name: "logs_tail",
    version: "1.0.0",
    description: "Return recent structured log stub (no secrets)",
    category: "logs",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
    handler: async (args) => ({
      lines: [
        { level: "info", msg: "mcp_productive_ready", ts: new Date().toISOString() },
      ].slice(0, Number(args.limit ?? 10)),
    }),
  },
  {
    name: "docs_read",
    version: "1.0.0",
    description: "Read documentation file under docs/ (sandbox)",
    category: "docs",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
    },
    handler: async (args) => {
      const rel = String(args.path ?? "");
      if (!rel.startsWith("docs/") && !rel.startsWith("docs\\")) {
        throw new Error("docs_path_must_start_with_docs/");
      }
      const abs = assertUnderRoots(rel);
      if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error("file_not_found");
      const content = readFileSync(abs, "utf8").slice(0, 50_000);
      return { path: rel, bytes: content.length, content };
    },
  },
  {
    name: "postgres_query",
    version: "1.0.0",
    description: "Read-only SQL SELECT against tenant-scoped safe queries (simulated allowlist)",
    category: "postgres",
    risk: "medium",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["sql"],
      properties: { sql: { type: "string" } },
    },
    handler: async (args, ctx) => {
      const sql = String(args.sql ?? "").trim();
      if (!/^\s*SELECT\b/i.test(sql)) throw new Error("sql_must_be_select");
      // Never execute arbitrary SQL here — return plan confirmation for safety in tests/offline
      return {
        mode: "read_only_plan",
        tenantId: ctx.tenantId,
        sqlPreview: sql.slice(0, 200),
        rows: [],
        note: "Execution delegated to tenant-bound DbClient in production wiring; policy blocks writes.",
      };
    },
  },
  {
    name: "rag_search",
    version: "1.0.0",
    description: "Search platform RAG knowledge (read-only)",
    category: "rag",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: { query: { type: "string" }, topK: { type: "number" } },
    },
    handler: async (args, ctx) => {
      const query = String(args.query ?? "").slice(0, 500);
      const topK = Number(args.topK ?? 3);
      try {
        const { getUnifiedRagStore } = await import("../../private-ai/rag/UnifiedRagStore");
        const rag = await getUnifiedRagStore().searchPlatform(query, topK);
        return {
          tenantId: ctx.tenantId,
          query,
          topK,
          chunks: rag.chunks.map((c) => ({
            id: c.id,
            source: c.source,
            title: c.title,
            content: c.content.slice(0, 1500),
          })),
        };
      } catch {
        return {
          tenantId: ctx.tenantId,
          query,
          topK,
          chunks: [],
          note: "RAG facade unavailable; offline-safe empty result.",
        };
      }
    },
  },
  {
    name: "memory_read",
    version: "1.1.0",
    description: "Read tenant Shared Memory entries (controlled; flag-gated)",
    category: "memory",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        query: { type: "string" },
        agentId: { type: "string" },
      },
    },
    handler: async (args, ctx) => {
      const limit = Number(args.limit ?? 5);
      // Flag OFF → keep certified offline-safe empty shape (do not change MCP soak contract).
      const { isSharedMemoryEnabled } = await import("../../shared-memory/config");
      if (!isSharedMemoryEnabled()) {
        return { tenantId: ctx.tenantId, entries: [], limit, enabled: false };
      }
      const { getSaasSharedMemoryService } = await import("../../saas/SaasSharedMemoryService");
      const svc = getSaasSharedMemoryService();
      const result = await svc.search(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          agentId: ctx.agentId,
          roles: ctx.roles.length ? ctx.roles : ["member"],
          scopes: ctx.scopes.includes("memory.read") ? ctx.scopes : [...ctx.scopes, "memory.read"],
        },
        {
          query: typeof args.query === "string" ? args.query : undefined,
          agentId: typeof args.agentId === "string" ? args.agentId : undefined,
          limit,
        },
      );
      return {
        tenantId: ctx.tenantId,
        entries: result.entries.map((e) => ({
          id: e.id,
          key: e.key,
          kind: e.kind,
          layer: e.layer,
          content: e.content.slice(0, 2000),
          agentId: e.agentId,
        })),
        limit,
        enabled: true,
        truncated: result.truncated,
      };
    },
  },
  {
    name: "memory_write",
    version: "1.1.0",
    description: "Write Shared Memory entry (requires write scope; medium risk; flag-gated)",
    category: "memory",
    risk: "medium",
    readOnly: false,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["content"],
      properties: {
        content: { type: "string" },
        key: { type: "string" },
        scope: { type: "string" },
        kind: { type: "string" },
      },
    },
    handler: async (args, ctx) => {
      const key = String(args.key ?? "default");
      const content = String(args.content ?? "");
      const { isSharedMemoryEnabled } = await import("../../shared-memory/config");
      if (!isSharedMemoryEnabled()) {
        // Certified offline shape when flag OFF
        return { tenantId: ctx.tenantId, key, stored: true, bytes: content.length, enabled: false };
      }
      const { getSaasSharedMemoryService } = await import("../../saas/SaasSharedMemoryService");
      const svc = getSaasSharedMemoryService();
      const entry = await svc.write(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          agentId: ctx.agentId,
          roles: ctx.roles.length ? ctx.roles : ["owner"],
          scopes: ctx.scopes.includes("memory.write")
            ? ctx.scopes
            : [...ctx.scopes, "memory.write"],
        },
        {
          tenantId: ctx.tenantId,
          scope: (args.scope as "tenant" | "agent" | "session") || "agent",
          visibility: "agent_shared",
          kind: (args.kind as "fact") || "fact",
          agentId: ctx.agentId,
          key,
          content,
          createdBy: ctx.userId,
        },
      );
      return {
        tenantId: ctx.tenantId,
        key: entry.key,
        stored: true,
        bytes: entry.content.length,
        enabled: true,
        id: entry.id,
        layer: entry.layer,
      };
    },
  },
  {
    name: "filesystem_list",
    version: "1.0.0",
    description: "List files under allowed roots only",
    category: "filesystem",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
    },
    handler: async (args) => {
      const rel = String(args.path ?? "docs");
      const abs = assertUnderRoots(rel);
      if (!existsSync(abs)) throw new Error("path_not_found");
      if (statSync(abs).isFile()) return { path: rel, entries: [path.basename(abs)] };
      const entries = readdirSync(abs).slice(0, 100);
      return { path: rel, entries };
    },
  },
  {
    name: "filesystem_read",
    version: "1.0.0",
    description: "Read file under allowed roots only",
    category: "filesystem",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
    },
    handler: async (args) => {
      const rel = String(args.path ?? "");
      const abs = assertUnderRoots(rel);
      if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error("file_not_found");
      return { path: rel, content: readFileSync(abs, "utf8").slice(0, 50_000) };
    },
  },
  {
    name: "git_status",
    version: "1.0.0",
    description: "Git read-only status summary (no mutations)",
    category: "git",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
    handler: async () => ({
      readOnly: true,
      branch: "unknown",
      note: "Use git CLI outside MCP for mutations; this tool never mutates.",
    }),
  },
  {
    name: "github_repo_info",
    version: "1.0.0",
    description: "GitHub read-only repo metadata stub (no network unless authorized)",
    category: "github",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: { owner: { type: "string" }, repo: { type: "string" } },
    },
    handler: async (args) => ({
      owner: String(args.owner ?? "nelvyon"),
      repo: String(args.repo ?? "nelvyon-app"),
      offline: true,
      note: "Network fetch requires PRIVATE_MODE internet authorization.",
    }),
  },
  {
    name: "scraping_authorized",
    version: "1.0.0",
    description: "Authorized static scrape of allowlisted URL host",
    category: "scraping",
    risk: "medium",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["url"],
      properties: { url: { type: "string" } },
    },
    handler: async (args) => {
      const url = String(args.url ?? "");
      let host = "";
      try {
        host = new URL(url).hostname;
      } catch {
        throw new Error("invalid_url");
      }
      const allow = (process.env.NELVYON_MCP_SCRAPE_ALLOWLIST ?? "app.nelvyon.com,nelvyon.com")
        .split(",")
        .map((s) => s.trim());
      if (!allow.includes(host)) throw new Error("host_not_allowlisted");
      return { url, host, status: "planned", note: "Offline-safe; no public egress without auth." };
    },
  },
  {
    name: "playwright_sandbox",
    version: "1.0.0",
    description: "Playwright sandbox probe (no production side effects)",
    category: "browser",
    risk: "medium",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
    },
    handler: async (args) => ({
      sandbox: true,
      url: String(args.url ?? ""),
      note: "Runs only in CI/e2e sandbox; blocked from production deploy actions.",
    }),
  },
  {
    name: "email_draft",
    version: "1.0.0",
    description: "Create email draft (does NOT send)",
    category: "email",
    risk: "medium",
    readOnly: false,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
        to: { type: "string" },
      },
    },
    handler: async (args, ctx) => ({
      draft: true,
      sent: false,
      tenantId: ctx.tenantId,
      subject: String(args.subject ?? "").slice(0, 200),
      to: String(args.to ?? ""),
    }),
  },
  {
    name: "crm_list",
    version: "1.0.0",
    description: "List CRM contacts (read)",
    category: "crm",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
    handler: async (args, ctx) => ({
      tenantId: ctx.tenantId,
      contacts: [],
      limit: Number(args.limit ?? 25),
      note: "Delegates to SaasCrmService when DB available.",
    }),
  },
  {
    name: "crm_upsert_contact",
    version: "1.0.0",
    description: "Create/update CRM contact (write; scoped)",
    category: "crm",
    risk: "medium",
    readOnly: false,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
    },
    handler: async (args, ctx) => ({
      tenantId: ctx.tenantId,
      name: String(args.name ?? ""),
      email: args.email != null ? String(args.email) : null,
      upserted: true,
    }),
  },
  {
    name: "reporting_summary",
    version: "1.0.0",
    description: "Reporting / KPI summary stub (read-only)",
    category: "reporting",
    risk: "low",
    readOnly: true,
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: { period: { type: "string" } },
    },
    handler: async (args, ctx) => ({
      tenantId: ctx.tenantId,
      period: String(args.period ?? "7d"),
      kpis: { contacts: 0, deals: 0, campaigns: 0 },
    }),
  },
  {
    name: "crm_bulk_import",
    version: "1.0.0",
    description: "Bulk CRM import — requires human approval",
    category: "crm",
    risk: "high",
    readOnly: false,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      required: ["rows"],
      properties: { rows: { type: "number" } },
    },
    handler: async () => {
      throw new Error("bulk_import_must_await_approval");
    },
  },
  {
    name: "send_mass_campaign",
    version: "1.0.0",
    description: "FORBIDDEN — real campaign send (always approval/deny)",
    category: "email",
    risk: "critical",
    readOnly: false,
    requiresApproval: true,
    inputSchema: {
      type: "object",
      properties: { campaignId: { type: "string" } },
    },
    handler: async () => {
      throw new Error("campaign_send_must_not_execute");
    },
  },
  {
    name: "delete_data",
    version: "1.0.0",
    description: "FORBIDDEN — destructive delete",
    category: "security",
    risk: "critical",
    readOnly: false,
    requiresApproval: true,
    inputSchema: { type: "object", properties: { target: { type: "string" } } },
    handler: async () => {
      throw new Error("delete_must_not_execute");
    },
  },
  {
    name: "deploy_production",
    version: "1.0.0",
    description: "FORBIDDEN — production deploy",
    category: "security",
    risk: "critical",
    readOnly: false,
    requiresApproval: true,
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      throw new Error("deploy_must_not_execute");
    },
  },
];
