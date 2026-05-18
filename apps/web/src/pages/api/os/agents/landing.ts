import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { LandingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getLandingABVariantAgent,
  getLandingBenefitsSectionAgent,
  getLandingConversionAuditAgent,
  getLandingFAQBuilderAgent,
  getLandingHeroCopyAgent,
  getLandingMobileFirstAgent,
  getLandingSocialProofAgent,
  getLandingUrgencyAgent,
} from "../../../../../../../backend/os-agents/sectors/landing";

type LandingAgentId =
  | "landing-hero-copy"
  | "landing-benefits-section"
  | "landing-social-proof"
  | "landing-faq-builder"
  | "landing-urgency"
  | "landing-mobile-first"
  | "landing-ab-variant"
  | "landing-conversion-audit";

const IDS: LandingAgentId[] = [
  "landing-hero-copy",
  "landing-benefits-section",
  "landing-social-proof",
  "landing-faq-builder",
  "landing-urgency",
  "landing-mobile-first",
  "landing-ab-variant",
  "landing-conversion-audit",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceLandingInput(userId: string, raw: unknown): LandingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const campaignGoal = typeof raw.campaignGoal === "string" ? raw.campaignGoal.trim() : "";
  const targetAudience = typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : "";
  if (!sector || !brand || !campaignGoal || !targetAudience) {
    throw new Error("sector, brand, campaignGoal y targetAudience son obligatorios");
  }
  const product = typeof raw.product === "string" ? raw.product.trim() : undefined;
  const tone = typeof raw.tone === "string" ? raw.tone.trim() : undefined;
  const cta = typeof raw.cta === "string" ? raw.cta.trim() : undefined;
  return {
    userId,
    sector,
    brand,
    campaignGoal,
    targetAudience,
    product: product || undefined,
    tone: tone || undefined,
    cta: cta || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO landing_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as LandingAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceLandingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as LandingAgentId) {
      case "landing-hero-copy":
        result = await getLandingHeroCopyAgent().run(input);
        break;
      case "landing-benefits-section":
        result = await getLandingBenefitsSectionAgent().run(input);
        break;
      case "landing-social-proof":
        result = await getLandingSocialProofAgent().run(input);
        break;
      case "landing-faq-builder":
        result = await getLandingFAQBuilderAgent().run(input);
        break;
      case "landing-urgency":
        result = await getLandingUrgencyAgent().run(input);
        break;
      case "landing-mobile-first":
        result = await getLandingMobileFirstAgent().run(input);
        break;
      case "landing-ab-variant":
        result = await getLandingABVariantAgent().run(input);
        break;
      case "landing-conversion-audit":
        result = await getLandingConversionAuditAgent().run(input);
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
