import { randomUUID } from "node:crypto";

import { ELITE_V300_STANDARDS } from "../../prompts/elitePromptLibrary";
import type { ILlmClient, LlmOptions } from "../../LlmClient";
import { LlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";

export const AUDIT_LOG_SECTOR = "auditlog";

export type AuditActionType =
  | "LOGIN"
  | "LOGOUT"
  | "CONTENT_GENERATED"
  | "PLAN_CHANGED"
  | "INTEGRATION_ACTIVATED"
  | "INTEGRATION_DEACTIVATED"
  | "REPORT_DOWNLOADED"
  | "AGENT_RUN"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "BILLING_EVENT"
  | "CHURN_RISK_DETECTED"
  | "SUPPORT_TICKET_CREATED"
  | "PASSWORD_CHANGED"
  | "MFA_ENABLED"
  | "MFA_DISABLED"
  | "EXPORT_REQUESTED"
  | "GDPR_DELETE_REQUESTED";

export interface AuditLogInput {
  userId: string;
  actionType: AuditActionType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditLogOutput {
  logged: boolean;
  auditId: string;
  summary: string;
  riskScore: number;
  anomalyDetected: boolean;
  anomalyReason?: string;
}

export function llmOpts(_agentId: string): LlmOptions {
  return {
    model: "gpt-4.1",
    temperature: 0.1,
    maxTokens: 800,
    fallback: "gpt-4o-mini",
  };
}

function parseJson<T>(raw: string, label: string): T {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const payload = fenced?.[1] ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as T;
  } catch {
    throw new Error(`${label}: JSON inválido`);
  }
}

function clampRisk(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function parseAuditLlmJson(raw: string, label: string): Omit<AuditLogOutput, "logged" | "auditId"> {
  const p = parseJson<{
    summary?: unknown;
    riskScore?: unknown;
    anomalyDetected?: unknown;
    anomalyReason?: unknown;
  }>(raw, label);
  const summary = typeof p.summary === "string" ? p.summary : String(p.summary ?? "");
  const riskScore = clampRisk(typeof p.riskScore === "number" ? p.riskScore : Number(p.riskScore));
  const anomalyDetected = Boolean(p.anomalyDetected);
  const anomalyReason =
    typeof p.anomalyReason === "string" && p.anomalyReason.trim() ? p.anomalyReason.trim() : undefined;
  return { summary, riskScore, anomalyDetected, anomalyReason };
}

export function buildAuditPrompt(params: {
  eliteRole: string;
  mission: string;
  fewShotExample: string;
  input: AuditLogInput;
}): string {
  const meta =
    params.input.metadata && Object.keys(params.input.metadata).length > 0
      ? JSON.stringify(params.input.metadata, null, 0)
      : "{}";
  return `${params.eliteRole}

${ELITE_V300_STANDARDS}

Detección de anomalías en patrones de auditoría (orientativo, sin bloquear usuarios automáticamente desde este modelo).

EVENTO A ANALIZAR:
- actionType: ${params.input.actionType}
- entityType: ${params.input.entityType ?? "—"}
- entityId: ${params.input.entityId ?? "—"}
- ipAddress: ${params.input.ipAddress ?? "—"}
- userAgent: ${params.input.userAgent ?? "—"}
- sessionId: ${params.input.sessionId ?? "—"}
- metadata: ${meta}

FEW-SHOT (alto rendimiento):
${params.fewShotExample}

MISIÓN:
${params.mission}

OUTPUT: Responde **solo** JSON válido UTF-8 (sin markdown):
{"summary":"una línea ejecutiva del evento y evaluación","riskScore":0-100,"anomalyDetected":true|false,"anomalyReason":"opcional, vacío si no aplica"}`;
}

export async function runAuditLogAgentCore(
  agentId: string,
  llm: ILlmClient,
  params: {
    eliteRole: string;
    mission: string;
    fewShotExample: string;
  },
  input: AuditLogInput,
): Promise<AuditLogOutput> {
  const prompt = buildAuditPrompt({
    eliteRole: params.eliteRole,
    mission: params.mission,
    fewShotExample: params.fewShotExample,
    input,
  });
  const raw = await llm.complete(prompt, llmOpts(agentId));
  const parsed = parseAuditLlmJson(raw, agentId);
  const auditId = randomUUID();
  const out: AuditLogOutput = {
    logged: true,
    auditId,
    ...parsed,
  };
  try {
    await new LearningService().recordOutcome(input.userId, agentId, AUDIT_LOG_SECTOR, input, out, "generated");
  } catch {
    /* sin DB en tests */
  }
  return out;
}

export function getDefaultAuditLogLlm(): ILlmClient {
  return LlmClient.getInstance();
}
