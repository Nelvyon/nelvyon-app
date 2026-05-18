import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SeoInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSeoContentGapAgent,
  getSeoContentOptimizerAgent,
  getSeoEEATBoosterAgent,
  getSeoInternalLinkingAgent,
  getSeoKeywordResearchAgent,
  getSeoSchemaMarkupAgent,
  getSeoSGEReadinessAgent,
  getSeoTitleMetaAgent,
} from "../../../../../../../backend/os-agents/sectors/seo";

type SeoAgentId =
  | "seo-keyword-research"
  | "seo-content-optimizer"
  | "seo-title-meta"
  | "seo-content-gap"
  | "seo-internal-linking"
  | "seo-schema-markup"
  | "seo-eeat-booster"
  | "seo-sge-readiness";

const IDS: SeoAgentId[] = [
  "seo-keyword-research",
  "seo-content-optimizer",
  "seo-title-meta",
  "seo-content-gap",
  "seo-internal-linking",
  "seo-schema-markup",
  "seo-eeat-booster",
  "seo-sge-readiness",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceSeoInput(userId: string, raw: unknown): SeoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const keyword = typeof raw.keyword === "string" ? raw.keyword.trim() : "";
  if (!sector || !keyword) throw new Error("sector y keyword son obligatorios");
  const url = typeof raw.url === "string" ? raw.url.trim() : undefined;
  const content = typeof raw.content === "string" ? raw.content : undefined;
  let competitors: string[] | undefined;
  if (raw.competitors != null) {
    if (!Array.isArray(raw.competitors)) throw new Error("competitors debe ser un array");
    competitors = raw.competitors.map((c) => String(c)).filter(Boolean);
  }
  return {
    userId,
    sector,
    keyword,
    url: url || undefined,
    content,
    competitors,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO seo_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as SeoAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceSeoInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SeoAgentId) {
      case "seo-keyword-research":
        result = await getSeoKeywordResearchAgent().run(input);
        break;
      case "seo-content-optimizer":
        result = await getSeoContentOptimizerAgent().run(input);
        break;
      case "seo-title-meta":
        result = await getSeoTitleMetaAgent().run(input);
        break;
      case "seo-content-gap":
        result = await getSeoContentGapAgent().run(input);
        break;
      case "seo-internal-linking":
        result = await getSeoInternalLinkingAgent().run(input);
        break;
      case "seo-schema-markup":
        result = await getSeoSchemaMarkupAgent().run(input);
        break;
      case "seo-eeat-booster":
        result = await getSeoEEATBoosterAgent().run(input);
        break;
      case "seo-sge-readiness":
        result = await getSeoSGEReadinessAgent().run(input);
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
