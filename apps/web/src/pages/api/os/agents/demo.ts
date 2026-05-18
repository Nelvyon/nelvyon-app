import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { DemoInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getDemoAnalyticsInsightAgent,
  getDemoConversionNudgeAgent,
  getDemoFollowUpSequenceAgent,
  getDemoObjectionHandlerAgent,
  getDemoPersonalizationAgent,
  getDemoSandboxDataAgent,
  getDemoScriptGeneratorAgent,
  getDemoValuePropositionAgent,
} from "../../../../../../../backend/os-agents/sectors/demo";

type DemoLibraryAgentId =
  | "demo-personalization"
  | "demo-script-generator"
  | "demo-value-proposition"
  | "demo-objection-handler"
  | "demo-sandbox-data"
  | "demo-conversion-nudge"
  | "demo-follow-up-sequence"
  | "demo-analytics-insight";

const IDS: DemoLibraryAgentId[] = [
  "demo-personalization",
  "demo-script-generator",
  "demo-value-proposition",
  "demo-objection-handler",
  "demo-sandbox-data",
  "demo-conversion-nudge",
  "demo-follow-up-sequence",
  "demo-analytics-insight",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceDemoInput(userId: string, raw: unknown): DemoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  if (!sector) throw new Error("sector es obligatorio");
  const visitorType = typeof raw.visitorType === "string" ? raw.visitorType.trim() : undefined;
  const useCase = typeof raw.useCase === "string" ? raw.useCase.trim() : undefined;
  const companySize = typeof raw.companySize === "string" ? raw.companySize.trim() : undefined;
  const painPoint = typeof raw.painPoint === "string" ? raw.painPoint.trim() : undefined;
  return {
    userId,
    sector,
    visitorType: visitorType || undefined,
    useCase: useCase || undefined,
    companySize: companySize || undefined,
    painPoint: painPoint || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO demo_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as DemoLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceDemoInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as DemoLibraryAgentId) {
      case "demo-personalization":
        result = await getDemoPersonalizationAgent().run(input);
        break;
      case "demo-script-generator":
        result = await getDemoScriptGeneratorAgent().run(input);
        break;
      case "demo-value-proposition":
        result = await getDemoValuePropositionAgent().run(input);
        break;
      case "demo-objection-handler":
        result = await getDemoObjectionHandlerAgent().run(input);
        break;
      case "demo-sandbox-data":
        result = await getDemoSandboxDataAgent().run(input);
        break;
      case "demo-conversion-nudge":
        result = await getDemoConversionNudgeAgent().run(input);
        break;
      case "demo-follow-up-sequence":
        result = await getDemoFollowUpSequenceAgent().run(input);
        break;
      case "demo-analytics-insight":
        result = await getDemoAnalyticsInsightAgent().run(input);
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
