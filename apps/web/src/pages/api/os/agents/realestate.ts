import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getBuyerPersonaAgent,
  getLeadNurturingRealEstateAgent,
  getMarketReportAgent,
  getMortgageCalculatorContentAgent,
  getNeighborhoodGuideAgent,
  getOpenHouseEmailAgent,
  getPropertyDescriptionAgent,
  getPropertyPhotoPromptAgent,
  getPropertyVideoScriptAgent,
  getSocialProofAgent,
} from "../../../../../../../backend/os-agents/sectors/realestate";

type AgentId =
  | "property-description"
  | "property-photo-prompt"
  | "buyer-persona"
  | "property-video-script"
  | "openhouse-email"
  | "mortgage-content"
  | "neighborhood-guide"
  | "lead-nurturing-realestate"
  | "social-proof"
  | "market-report";

const IDS: AgentId[] = [
  "property-description",
  "property-photo-prompt",
  "buyer-persona",
  "property-video-script",
  "openhouse-email",
  "mortgage-content",
  "neighborhood-guide",
  "lead-nurturing-realestate",
  "social-proof",
  "market-report",
];

async function saveResult(userId: string, agentId: AgentId, input: unknown, result: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO realestate_results (user_id, agent_id, input, result) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
    [userId, agentId, JSON.stringify(input ?? {}), JSON.stringify(result ?? {})],
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
    if (!IDS.includes(agentId as AgentId)) return res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? {};
    let result: unknown;
    switch (agentId as AgentId) {
      case "property-description": result = await getPropertyDescriptionAgent().generateDescription(user.userId, input as never); break;
      case "property-photo-prompt": result = await getPropertyPhotoPromptAgent().generatePhotoPrompt(user.userId, input as never); break;
      case "buyer-persona": result = await getBuyerPersonaAgent().createBuyerPersona(user.userId, input as never); break;
      case "property-video-script": result = await getPropertyVideoScriptAgent().generateVideoScript(user.userId, input as never); break;
      case "openhouse-email": result = await getOpenHouseEmailAgent().createOpenHouseCampaign(user.userId, input as never); break;
      case "mortgage-content": result = await getMortgageCalculatorContentAgent().createMortgageContent(user.userId, input as never); break;
      case "neighborhood-guide": result = await getNeighborhoodGuideAgent().createNeighborhoodGuide(user.userId, input as never); break;
      case "lead-nurturing-realestate": result = await getLeadNurturingRealEstateAgent().designNurturing(user.userId, input as never); break;
      case "social-proof": result = await getSocialProofAgent().generateSocialProof(user.userId, input as never); break;
      case "market-report": result = await getMarketReportAgent().generateMarketReport(user.userId, input as never); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}

