/**
 * MCP Productivo feature flags and limits.
 * Default OFF — require explicit NELVYON_MCP_PRODUCTIVE_ENABLED=1 (fail-closed).
 */

export function isMcpProductiveEnabled(): boolean {
  const v = process.env.NELVYON_MCP_PRODUCTIVE_ENABLED?.trim() ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}

/** Labs SDK flag — optional npm path; productive MCP works without it. */
export function isMcpSdkEnabled(): boolean {
  const v = process.env.NELVYON_MCP_TS_ENABLED ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}

export function getMcpDefaultTimeoutMs(): number {
  return Math.max(500, Number(process.env.NELVYON_MCP_TIMEOUT_MS ?? 15_000));
}

export function getMcpMaxRetries(): number {
  return Math.min(3, Math.max(0, Number(process.env.NELVYON_MCP_MAX_RETRIES ?? 1)));
}

export function getMcpRateLimitPerMinute(): number {
  return Math.max(1, Number(process.env.NELVYON_MCP_RATE_LIMIT_PER_MIN ?? 60));
}

export function getMcpCircuitFailureThreshold(): number {
  return Math.max(2, Number(process.env.NELVYON_MCP_CIRCUIT_FAILURES ?? 5));
}

export function getMcpCircuitResetMs(): number {
  return Math.max(1000, Number(process.env.NELVYON_MCP_CIRCUIT_RESET_MS ?? 30_000));
}

export function getMcpAllowedFsRoots(): string[] {
  const raw = process.env.NELVYON_MCP_FS_ROOTS ?? "docs,backend/local-ai/knowledge";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getMcpApprovalTtlHours(): number {
  return Math.max(1, Number(process.env.NELVYON_MCP_APPROVAL_TTL_HOURS ?? 168));
}

export type McpConfigSnapshot = {
  enabled: boolean;
  sdkEnabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  rateLimitPerMin: number;
  circuitFailures: number;
  circuitResetMs: number;
  fsRoots: string[];
};

export function getMcpConfig(): McpConfigSnapshot {
  return {
    enabled: isMcpProductiveEnabled(),
    sdkEnabled: isMcpSdkEnabled(),
    timeoutMs: getMcpDefaultTimeoutMs(),
    maxRetries: getMcpMaxRetries(),
    rateLimitPerMin: getMcpRateLimitPerMinute(),
    circuitFailures: getMcpCircuitFailureThreshold(),
    circuitResetMs: getMcpCircuitResetMs(),
    fsRoots: getMcpAllowedFsRoots(),
  };
}

export function resetMcpConfigEnvForTests(): void {
  delete process.env.NELVYON_MCP_PRODUCTIVE_ENABLED;
  delete process.env.NELVYON_MCP_TS_ENABLED;
  delete process.env.NELVYON_MCP_TIMEOUT_MS;
  delete process.env.NELVYON_MCP_MAX_RETRIES;
  delete process.env.NELVYON_MCP_RATE_LIMIT_PER_MIN;
  delete process.env.NELVYON_MCP_CIRCUIT_FAILURES;
  delete process.env.NELVYON_MCP_CIRCUIT_RESET_MS;
  delete process.env.NELVYON_MCP_FS_ROOTS;
}
