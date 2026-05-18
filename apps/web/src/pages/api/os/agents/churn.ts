import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ChurnInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getChurnEscalationTriggerAgent,
  getChurnReengagementSequenceAgent,
  getChurnRetentionOfferAgent,
  getChurnRiskScorerAgent,
  getChurnRootCauseAnalystAgent,
  getChurnSegmentClassifierAgent,
  getChurnSignalDetectorAgent,
  getChurnSuccessStoryAgent,
} from "../../../../../../../backend/os-agents/sectors/churn";

type ChurnAgentId =
  | "churn-risk-scorer"
  | "churn-signal-detector"
  | "churn-segment-classifier"
  | "churn-retention-offer"
  | "churn-reengagement-sequence"
  | "churn-root-cause-analyst"
  | "churn-success-story"
  | "churn-escalation-trigger";

const IDS: ChurnAgentId[] = [
  "churn-risk-scorer",
  "churn-signal-detector",
  "churn-segment-classifier",
  "churn-retention-offer",
  "churn-reengagement-sequence",
  "churn-root-cause-analyst",
  "churn-success-story",
  "churn-escalation-trigger",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceChurnInput(userId: string, raw: unknown): ChurnInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const contactId = typeof raw.contactId === "string" ? raw.contactId.trim() : "";
  if (!sector || !contactId) throw new Error("sector y contactId son obligatorios");

  if (!isRecord(raw.engagementData)) throw new Error("engagementData debe ser un objeto");
  const engagementData: Record<string, string> = {};
  for (const [k, val] of Object.entries(raw.engagementData)) {
    engagementData[String(k)] = typeof val === "string" ? val : JSON.stringify(val);
  }

  const planType = typeof raw.planType === "string" ? raw.planType.trim() : undefined;
  let monthsActive: number | undefined;
  if (raw.monthsActive != null) {
    const n = typeof raw.monthsActive === "number" ? raw.monthsActive : Number(raw.monthsActive);
    if (!Number.isFinite(n)) throw new Error("monthsActive inválido");
    monthsActive = Math.round(n);
  }

  return {
    userId,
    sector,
    contactId,
    engagementData,
    planType: planType || undefined,
    monthsActive,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO churn_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ChurnAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceChurnInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ChurnAgentId) {
      case "churn-risk-scorer":
        result = await getChurnRiskScorerAgent().run(input);
        break;
      case "churn-signal-detector":
        result = await getChurnSignalDetectorAgent().run(input);
        break;
      case "churn-segment-classifier":
        result = await getChurnSegmentClassifierAgent().run(input);
        break;
      case "churn-retention-offer":
        result = await getChurnRetentionOfferAgent().run(input);
        break;
      case "churn-reengagement-sequence":
        result = await getChurnReengagementSequenceAgent().run(input);
        break;
      case "churn-root-cause-analyst":
        result = await getChurnRootCauseAnalystAgent().run(input);
        break;
      case "churn-success-story":
        result = await getChurnSuccessStoryAgent().run(input);
        break;
      case "churn-escalation-trigger":
        result = await getChurnEscalationTriggerAgent().run(input);
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
