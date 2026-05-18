import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { AuditActionType, AuditLogInput, AuditLogOutput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getAuditAlertDispatcherAgent,
  getAuditAnomalyDetectorAgent,
  getAuditComplianceReporterAgent,
  getAuditEventCaptureAgent,
  getAuditExportAgent,
  getAuditRetentionManagerAgent,
  getAuditRiskScorerAgent,
  getAuditSessionTrackerAgent,
} from "../../../../../../../backend/os-agents/sectors/auditlog";

type AuditLibraryAgentId =
  | "audit-event-capture"
  | "audit-anomaly-detector"
  | "audit-risk-scorer"
  | "audit-session-tracker"
  | "audit-compliance-reporter"
  | "audit-retention-manager"
  | "audit-export-agent"
  | "audit-alert-dispatcher";

const IDS: AuditLibraryAgentId[] = [
  "audit-event-capture",
  "audit-anomaly-detector",
  "audit-risk-scorer",
  "audit-session-tracker",
  "audit-compliance-reporter",
  "audit-retention-manager",
  "audit-export-agent",
  "audit-alert-dispatcher",
];

const ACTION_TYPES: AuditActionType[] = [
  "LOGIN",
  "LOGOUT",
  "CONTENT_GENERATED",
  "PLAN_CHANGED",
  "INTEGRATION_ACTIVATED",
  "INTEGRATION_DEACTIVATED",
  "REPORT_DOWNLOADED",
  "AGENT_RUN",
  "API_KEY_CREATED",
  "API_KEY_REVOKED",
  "BILLING_EVENT",
  "CHURN_RISK_DETECTED",
  "SUPPORT_TICKET_CREATED",
  "PASSWORD_CHANGED",
  "MFA_ENABLED",
  "MFA_DISABLED",
  "EXPORT_REQUESTED",
  "GDPR_DELETE_REQUESTED",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceAuditInput(userId: string, raw: unknown): AuditLogInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const actionTypeRaw = typeof raw.actionType === "string" ? raw.actionType.trim() : "";
  if (!ACTION_TYPES.includes(actionTypeRaw as AuditActionType)) {
    throw new Error("actionType inválido");
  }
  const actionType = actionTypeRaw as AuditActionType;
  const entityType = typeof raw.entityType === "string" ? raw.entityType.trim() : undefined;
  const entityId = typeof raw.entityId === "string" ? raw.entityId.trim() : undefined;
  const ipAddress = typeof raw.ipAddress === "string" ? raw.ipAddress.trim() : undefined;
  const userAgent = typeof raw.userAgent === "string" ? raw.userAgent.trim() : undefined;
  const sessionId = typeof raw.sessionId === "string" ? raw.sessionId.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  return {
    userId,
    actionType,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    metadata,
    ipAddress: ipAddress || undefined,
    userAgent: userAgent || undefined,
    sessionId: sessionId || undefined,
  };
}

async function persistAuditRow(
  input: AuditLogInput,
  agentId: string,
  agentOutput: AuditLogOutput,
): Promise<string> {
  const rows = await DbClient.getInstance().query<{ id: string }>(
    `INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, metadata, ip_address, user_agent, session_id)
     VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7, $8)
     RETURNING id`,
    [
      input.userId,
      input.actionType,
      input.entityType ?? null,
      input.entityId ?? null,
      JSON.stringify({
        ...(input.metadata ?? {}),
        agentId,
        summary: agentOutput.summary,
        riskScore: agentOutput.riskScore,
        anomalyDetected: agentOutput.anomalyDetected,
        anomalyReason: agentOutput.anomalyReason ?? null,
        provisionalAuditId: agentOutput.auditId,
      }),
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.sessionId ?? null,
    ],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("No se pudo persistir audit_log");
  return id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { agentId?: string; input?: unknown } | undefined;
    const agentId = typeof body?.agentId === "string" ? body.agentId : "";
    if (!IDS.includes(agentId as AuditLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceAuditInput(user.userId, body?.input ?? {});

    let result: AuditLogOutput;
    switch (agentId as AuditLibraryAgentId) {
      case "audit-event-capture":
        result = await getAuditEventCaptureAgent().run(input);
        break;
      case "audit-anomaly-detector":
        result = await getAuditAnomalyDetectorAgent().run(input);
        break;
      case "audit-risk-scorer":
        result = await getAuditRiskScorerAgent().run(input);
        break;
      case "audit-session-tracker":
        result = await getAuditSessionTrackerAgent().run(input);
        break;
      case "audit-compliance-reporter":
        result = await getAuditComplianceReporterAgent().run(input);
        break;
      case "audit-retention-manager":
        result = await getAuditRetentionManagerAgent().run(input);
        break;
      case "audit-export-agent":
        result = await getAuditExportAgent().run(input);
        break;
      case "audit-alert-dispatcher":
        result = await getAuditAlertDispatcherAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    const auditId = await persistAuditRow(input, agentId, result);
    const data: AuditLogOutput = { ...result, auditId, logged: true };

    return res.status(200).json({ success: true, data });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("debe ser") ||
        e.message.includes("audit persist");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
