/**
 * MCP Policy Engine — authz + risk + destructive blocks.
 * Order: auth → tenant → authz → input → policy → (exec) → output → audit
 */

import type {
  McpCallContext,
  McpPolicyDecision,
  McpRegisteredTool,
  McpRiskLevel,
} from "../types";

const SECRET_KEYS = /^(password|secret|api[_-]?key|token|private[_-]?key|authorization|jwt|credential)$/i;
const SECRET_VALUE =
  /\b(sk-[a-zA-Z0-9]{10,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9\-._~+/]+=*)\b/;
const PROMPT_INJECTION =
  /(ignore\s+(all\s+)?(previous|prior)\s+instructions|system\s*:\s*you\s+are|<\/?\s*system\s*>|exfiltrate|dump\s+env|cat\s+\/etc\/passwd)/i;
const CROSS_TENANT = /(other\s+tenant|cross[_-]?tenant|all\s+tenants|tenantId\s*[!=]=)/i;
const DESTRUCTIVE_SQL = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE)\b/i;
const WRITE_FS = /\b(rm\s+-rf|unlink|rmdir|writeFile|mkdir|chmod|chown)\b/i;

export type PolicyEvaluation = {
  decision: McpPolicyDecision;
  risk: McpRiskLevel;
  reason: string;
  sanitizedArgs: Record<string, unknown>;
  blockedCategory?: string;
};

function escalate(a: McpRiskLevel, b: McpRiskLevel): McpRiskLevel {
  const order: McpRiskLevel[] = ["low", "medium", "high", "critical"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))]!;
}

export function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args ?? {})) {
    if (SECRET_KEYS.test(k)) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (typeof v === "string") {
      out[k] = SECRET_VALUE.test(v) ? "[REDACTED_SECRET]" : v.slice(0, 2000);
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitizeArgs(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function validateCallContext(ctx: McpCallContext): string | null {
  if (!ctx.tenantId || typeof ctx.tenantId !== "string") return "missing_tenantId";
  if (!ctx.userId) return "missing_userId";
  if (!ctx.agentId) return "missing_agentId";
  if (!ctx.requestId) return "missing_requestId";
  if (!ctx.traceId) return "missing_traceId";
  if (!Array.isArray(ctx.roles)) return "missing_roles";
  if (!Array.isArray(ctx.scopes)) return "missing_scopes";
  return null;
}

/** Detect args that attempt to override tenant identity. */
export function detectTenantOverride(
  args: Record<string, unknown>,
  tenantId: string,
): boolean {
  const argTenant = args.tenantId ?? args.tenant_id;
  if (argTenant != null && String(argTenant) !== tenantId) return true;
  const blob = JSON.stringify(args);
  return CROSS_TENANT.test(blob);
}

export function evaluatePolicy(
  tool: McpRegisteredTool,
  args: Record<string, unknown>,
  ctx: McpCallContext,
): PolicyEvaluation {
  const ctxErr = validateCallContext(ctx);
  if (ctxErr) {
    return {
      decision: "denied",
      risk: "critical",
      reason: ctxErr,
      sanitizedArgs: {},
      blockedCategory: "auth",
    };
  }

  if (detectTenantOverride(args, ctx.tenantId)) {
    return {
      decision: "denied",
      risk: "critical",
      reason: "cross_tenant_blocked",
      sanitizedArgs: sanitizeArgs(args),
      blockedCategory: "tenant_isolation",
    };
  }

  const blob = JSON.stringify(args);
  if (SECRET_VALUE.test(blob) || Object.keys(args).some((k) => SECRET_KEYS.test(k) && typeof args[k] === "string" && String(args[k]).length > 8)) {
    // Passing secrets INTO tools is blocked (exfiltration / credential abuse)
    const hasRawSecret = Object.entries(args).some(
      ([k, v]) => SECRET_KEYS.test(k) && typeof v === "string" && !String(v).startsWith("[REDACTED]"),
    );
    if (hasRawSecret || SECRET_VALUE.test(blob)) {
      return {
        decision: "denied",
        risk: "critical",
        reason: "secrets_blocked",
        sanitizedArgs: sanitizeArgs(args),
        blockedCategory: "secrets",
      };
    }
  }

  if (PROMPT_INJECTION.test(blob)) {
    return {
      decision: "denied",
      risk: "critical",
      reason: "prompt_injection_blocked",
      sanitizedArgs: sanitizeArgs(args),
      blockedCategory: "prompt_injection",
    };
  }

  let risk = tool.risk;
  const sql = String(args.sql ?? args.query ?? "");
  if (tool.name === "postgres_query" || tool.category === "postgres") {
    if (DESTRUCTIVE_SQL.test(sql)) {
      return {
        decision: "denied",
        risk: "critical",
        reason: "sql_write_blocked",
        sanitizedArgs: sanitizeArgs(args),
        blockedCategory: "sql_write",
      };
    }
  }

  if (tool.category === "filesystem" && WRITE_FS.test(blob)) {
    return {
      decision: "denied",
      risk: "critical",
      reason: "filesystem_write_blocked",
      sanitizedArgs: sanitizeArgs(args),
      blockedCategory: "filesystem",
    };
  }

  // Always-deny critical destructive tool names
  const FORBIDDEN = new Set([
    "delete_data",
    "send_mass_campaign",
    "charge_payment",
    "deploy_production",
    "rotate_credentials",
    "docker_host_exec",
    "publish_content",
  ]);
  if (FORBIDDEN.has(tool.name)) {
    return {
      decision: "denied",
      risk: "critical",
      reason: "destructive_tool_forbidden",
      sanitizedArgs: sanitizeArgs(args),
      blockedCategory: "destructive",
    };
  }

  if (tool.requiresApproval || risk === "high" || risk === "critical") {
    risk = escalate(risk, tool.risk);
    return {
      decision: "approval_required",
      risk,
      reason: tool.requiresApproval ? "tool_requires_approval" : `risk_${risk}`,
      sanitizedArgs: sanitizeArgs(args),
    };
  }

  // Scope check: write tools need mcp.write or workflows.execute
  if (!tool.readOnly) {
    const canWrite =
      ctx.scopes.includes("mcp.write") ||
      ctx.scopes.includes("workflows.execute") ||
      ctx.roles.includes("owner") ||
      ctx.roles.includes("admin");
    if (!canWrite) {
      return {
        decision: "denied",
        risk: "high",
        reason: "insufficient_scope_write",
        sanitizedArgs: sanitizeArgs(args),
        blockedCategory: "authorization",
      };
    }
  }

  return {
    decision: "allowed",
    risk,
    reason: "policy_ok",
    sanitizedArgs: sanitizeArgs(args),
  };
}

export function validateOutput(result: unknown): { ok: boolean; reason?: string } {
  if (result == null) return { ok: true };
  const text = typeof result === "string" ? result : JSON.stringify(result);
  if (SECRET_VALUE.test(text)) {
    return { ok: false, reason: "output_secret_leak" };
  }
  return { ok: true };
}
