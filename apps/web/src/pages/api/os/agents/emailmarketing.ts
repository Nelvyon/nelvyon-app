import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { EmailMarketingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getEmailAbandonedCartAgent,
  getEmailDeliverabilityAdvisorAgent,
  getEmailNewsletterBuilderAgent,
  getEmailNurtureSequenceAgent,
  getEmailPersonalizationEngineAgent,
  getEmailPromotionalCampaignAgent,
  getEmailReactivationAgent,
  getEmailSubjectLineOptimizerAgent,
  getEmailWelcomeSequenceAgent,
} from "../../../../../../../backend/os-agents/sectors/emailmarketing";

type EmailMarketingAgentId =
  | "email-subject-line-optimizer"
  | "email-welcome-sequence"
  | "email-nurture-sequence"
  | "email-reactivation"
  | "email-promotional-campaign"
  | "email-abandoned-cart"
  | "email-newsletter-builder"
  | "email-personalization-engine"
  | "email-deliverability-advisor";

const IDS: EmailMarketingAgentId[] = [
  "email-subject-line-optimizer",
  "email-welcome-sequence",
  "email-nurture-sequence",
  "email-reactivation",
  "email-promotional-campaign",
  "email-abandoned-cart",
  "email-newsletter-builder",
  "email-personalization-engine",
  "email-deliverability-advisor",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceEmailMarketingInput(userId: string, raw: unknown): EmailMarketingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const targetAudience = typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : "";
  const campaignGoal = typeof raw.campaignGoal === "string" ? raw.campaignGoal.trim() : "";
  if (!sector || !brand || !targetAudience || !campaignGoal) {
    throw new Error("sector, brand, targetAudience y campaignGoal son obligatorios");
  }
  const productOrService = typeof raw.productOrService === "string" ? raw.productOrService.trim() : undefined;
  const tone = typeof raw.tone === "string" ? raw.tone.trim() : undefined;
  return {
    userId,
    sector,
    brand,
    targetAudience,
    campaignGoal,
    productOrService: productOrService || undefined,
    tone: tone || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO email_marketing_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as EmailMarketingAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceEmailMarketingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as EmailMarketingAgentId) {
      case "email-subject-line-optimizer":
        result = await getEmailSubjectLineOptimizerAgent().run(input);
        break;
      case "email-welcome-sequence":
        result = await getEmailWelcomeSequenceAgent().run(input);
        break;
      case "email-nurture-sequence":
        result = await getEmailNurtureSequenceAgent().run(input);
        break;
      case "email-reactivation":
        result = await getEmailReactivationAgent().run(input);
        break;
      case "email-promotional-campaign":
        result = await getEmailPromotionalCampaignAgent().run(input);
        break;
      case "email-abandoned-cart":
        result = await getEmailAbandonedCartAgent().run(input);
        break;
      case "email-newsletter-builder":
        result = await getEmailNewsletterBuilderAgent().run(input);
        break;
      case "email-personalization-engine":
        result = await getEmailPersonalizationEngineAgent().run(input);
        break;
      case "email-deliverability-advisor":
        result = await getEmailDeliverabilityAdvisorAgent().run(input);
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
