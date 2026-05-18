import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SlaInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSlaClientNotificationAgent,
  getSlaCompensationCalculatorAgent,
  getSlaEscalationProtocolAgent,
  getSlaIncidentClassifierAgent,
  getSlaPostmortemAgent,
  getSlaReputationRepairAgent,
  getSlaRootCauseAgent,
  getSlaUptimeMonitorAgent,
} from "../../../../../../../backend/os-agents/sectors/sla";

type SlaLibraryAgentId =
  | "sla-incident-classifier"
  | "sla-uptime-monitor"
  | "sla-client-notification"
  | "sla-compensation-calculator"
  | "sla-postmortem"
  | "sla-escalation-protocol"
  | "sla-root-cause"
  | "sla-reputation-repair";

const IDS: SlaLibraryAgentId[] = [
  "sla-incident-classifier",
  "sla-uptime-monitor",
  "sla-client-notification",
  "sla-compensation-calculator",
  "sla-postmortem",
  "sla-escalation-protocol",
  "sla-root-cause",
  "sla-reputation-repair",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceAffectedFeatures(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
  return out.length ? out : undefined;
}

function coerceSlaInput(userId: string, raw: unknown): SlaInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const incidentType = typeof raw.incidentType === "string" ? raw.incidentType.trim() : "";
  if (!sector || !incidentType) {
    throw new Error("sector e incidentType son obligatorios");
  }
  let downtimeMinutes: number | undefined;
  if (typeof raw.downtimeMinutes === "number" && Number.isFinite(raw.downtimeMinutes)) {
    downtimeMinutes = raw.downtimeMinutes;
  } else if (typeof raw.downtimeMinutes === "string" && raw.downtimeMinutes.trim()) {
    const n = Number(raw.downtimeMinutes.trim());
    if (Number.isFinite(n)) downtimeMinutes = n;
  }
  const affectedFeatures = coerceAffectedFeatures(raw.affectedFeatures);
  const planType = typeof raw.planType === "string" ? raw.planType.trim() : undefined;
  return {
    userId,
    sector,
    incidentType,
    downtimeMinutes,
    affectedFeatures,
    planType: planType || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO sla_results (user_id, agent_id, sector, input, output)
     VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)`,
    [userId, agentId, sector, JSON.stringify(input ?? {}), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { agentId?: string; input?: unknown } | undefined;
    const agentId = typeof body?.agentId === "string" ? body.agentId : "";
    if (!IDS.includes(agentId as SlaLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceSlaInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SlaLibraryAgentId) {
      case "sla-incident-classifier":
        result = await getSlaIncidentClassifierAgent().run(input);
        break;
      case "sla-uptime-monitor":
        result = await getSlaUptimeMonitorAgent().run(input);
        break;
      case "sla-client-notification":
        result = await getSlaClientNotificationAgent().run(input);
        break;
      case "sla-compensation-calculator":
        result = await getSlaCompensationCalculatorAgent().run(input);
        break;
      case "sla-postmortem":
        result = await getSlaPostmortemAgent().run(input);
        break;
      case "sla-escalation-protocol":
        result = await getSlaEscalationProtocolAgent().run(input);
        break;
      case "sla-root-cause":
        result = await getSlaRootCauseAgent().run(input);
        break;
      case "sla-reputation-repair":
        result = await getSlaReputationRepairAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, input.sector, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorios") ||
        e.message.includes("debe ser");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
