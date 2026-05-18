import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { CreativeInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getCreativeAdCopyAgent,
  getCreativeBrandVoiceAgent,
  getCreativeNamingAgent,
  getCreativeProductDescAgent,
  getCreativeRepurposerAgent,
  getCreativeSlideDecksAgent,
  getCreativeTaglineGeneratorAgent,
  getCreativeVideoScriptAgent,
} from "../../../../../../../backend/os-agents/sectors/creative";

type CreativeLibraryAgentId =
  | "creative-brand-voice"
  | "creative-ad-copy"
  | "creative-video-script"
  | "creative-slide-decks"
  | "creative-tagline-generator"
  | "creative-product-desc"
  | "creative-naming"
  | "creative-repurposer";

const IDS: CreativeLibraryAgentId[] = [
  "creative-brand-voice",
  "creative-ad-copy",
  "creative-video-script",
  "creative-slide-decks",
  "creative-tagline-generator",
  "creative-product-desc",
  "creative-naming",
  "creative-repurposer",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceCreativeInput(userId: string, raw: unknown): CreativeInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const format = typeof raw.format === "string" ? raw.format.trim() : "";
  const targetAudience = typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : "";
  if (!sector || !brand || !format || !targetAudience) {
    throw new Error("sector, brand, format y targetAudience son obligatorios");
  }
  const goal = typeof raw.goal === "string" ? raw.goal.trim() : undefined;
  const tone = typeof raw.tone === "string" ? raw.tone.trim() : undefined;
  return {
    userId,
    sector,
    brand,
    format,
    targetAudience,
    goal: goal || undefined,
    tone: tone || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO creative_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as CreativeLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceCreativeInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as CreativeLibraryAgentId) {
      case "creative-brand-voice":
        result = await getCreativeBrandVoiceAgent().run(input);
        break;
      case "creative-ad-copy":
        result = await getCreativeAdCopyAgent().run(input);
        break;
      case "creative-video-script":
        result = await getCreativeVideoScriptAgent().run(input);
        break;
      case "creative-slide-decks":
        result = await getCreativeSlideDecksAgent().run(input);
        break;
      case "creative-tagline-generator":
        result = await getCreativeTaglineGeneratorAgent().run(input);
        break;
      case "creative-product-desc":
        result = await getCreativeProductDescAgent().run(input);
        break;
      case "creative-naming":
        result = await getCreativeNamingAgent().run(input);
        break;
      case "creative-repurposer":
        result = await getCreativeRepurposerAgent().run(input);
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
