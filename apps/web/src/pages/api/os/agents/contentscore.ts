import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ContentScoreInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getContentScoreAnalyzerAgent,
  getContentScoreBenchmarkAgent,
  getContentScoreCTAAgent,
  getContentScoreRankAgent,
  getContentScoreReportAgent,
  getContentScoreRewriterAgent,
  getContentScoreSEOAgent,
  getContentScoreToneAgent,
} from "../../../../../../../backend/os-agents/sectors/contentscore";

type ContentScoreLibraryAgentId =
  | "contentscore-analyzer"
  | "contentscore-rank"
  | "contentscore-rewriter"
  | "contentscore-seo"
  | "contentscore-cta"
  | "contentscore-tone"
  | "contentscore-benchmark"
  | "contentscore-report";

const IDS: ContentScoreLibraryAgentId[] = [
  "contentscore-analyzer",
  "contentscore-rank",
  "contentscore-rewriter",
  "contentscore-seo",
  "contentscore-cta",
  "contentscore-tone",
  "contentscore-benchmark",
  "contentscore-report",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceContentScoreInput(userId: string, raw: unknown): ContentScoreInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const contentBrief = typeof raw.contentBrief === "string" ? raw.contentBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    contentBrief: contentBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO contentscore_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ContentScoreLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceContentScoreInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ContentScoreLibraryAgentId) {
      case "contentscore-analyzer":
        result = await getContentScoreAnalyzerAgent().run(input);
        break;
      case "contentscore-rank":
        result = await getContentScoreRankAgent().run(input);
        break;
      case "contentscore-rewriter":
        result = await getContentScoreRewriterAgent().run(input);
        break;
      case "contentscore-seo":
        result = await getContentScoreSEOAgent().run(input);
        break;
      case "contentscore-cta":
        result = await getContentScoreCTAAgent().run(input);
        break;
      case "contentscore-tone":
        result = await getContentScoreToneAgent().run(input);
        break;
      case "contentscore-benchmark":
        result = await getContentScoreBenchmarkAgent().run(input);
        break;
      case "contentscore-report":
        result = await getContentScoreReportAgent().run(input);
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
