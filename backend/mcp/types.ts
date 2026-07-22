/**
 * NELVYON MCP Productivo — typed contracts.
 * Enterprise tool layer for Router / future orchestrator / agents.
 */

export const MCP_PROTOCOL_VERSION = "2024-11-05";
export const MCP_SERVER_VERSION = "2.0.0";

export type McpRiskLevel = "low" | "medium" | "high" | "critical";

export type McpPolicyDecision = "allowed" | "denied" | "approval_required";

export type McpToolCategory =
  | "health"
  | "metrics"
  | "logs"
  | "docs"
  | "postgres"
  | "rag"
  | "memory"
  | "filesystem"
  | "git"
  | "github"
  | "scraping"
  | "browser"
  | "email"
  | "crm"
  | "reporting"
  | "security";

export type McpCallContext = {
  tenantId: string;
  userId: string;
  agentId: string;
  requestId: string;
  traceId: string;
  roles: string[];
  scopes: string[];
  /** Optional model that requested the tool (Router). */
  model?: string;
  /** Idempotency key for safe retries. */
  idempotencyKey?: string;
};

export type McpToolDef = {
  name: string;
  version: string;
  description: string;
  category: McpToolCategory;
  risk: McpRiskLevel;
  readOnly: boolean;
  requiresApproval: boolean;
  inputSchema: Record<string, unknown>;
  tags?: string[];
};

export type McpToolHandler = (
  args: Record<string, unknown>,
  ctx: McpCallContext,
) => Promise<unknown>;

export type McpRegisteredTool = McpToolDef & {
  handler: McpToolHandler;
};

export type McpInvokeRequest = {
  toolName: string;
  args: Record<string, unknown>;
  ctx: McpCallContext;
  timeoutMs?: number;
  /** When true, skip execution and only evaluate policy. */
  dryRun?: boolean;
};

export type McpInvokeResult = {
  toolCallId: string;
  toolName: string;
  decision: McpPolicyDecision;
  ok: boolean;
  result?: unknown;
  error?: string;
  errorCode?: string;
  risk: McpRiskLevel;
  durationMs: number;
  approvalId?: string;
  approvalRequired: boolean;
  retries: number;
  circuitOpen: boolean;
  rateLimited: boolean;
  idempotentReplay: boolean;
  auditId?: string;
  sanitizedArgs: Record<string, unknown>;
};

export type McpApprovalPayload = {
  actionId: string;
  tenantId: string;
  userId: string;
  agentId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason: string;
  risk: McpRiskLevel;
  expiresAt: string;
  requestId: string;
  traceId: string;
};

export type McpHealthStatus = {
  ok: boolean;
  enabled: boolean;
  version: string;
  protocolVersion: string;
  toolCount: number;
  circuitOpen: boolean;
  pendingApprovalsHint: string;
  message: string;
};

export type McpAuditRecord = {
  toolCallId: string;
  tenantId: string;
  userId: string;
  agentId: string;
  toolName: string;
  risk: McpRiskLevel;
  decision: McpPolicyDecision;
  durationMs: number;
  ok: boolean;
  errorCode?: string;
  approvalId?: string;
  model?: string;
  requestId: string;
  traceId: string;
  argsHash: string;
};
