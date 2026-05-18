import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ReviewsInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getReviewsCompetitorBenchmarkAgent,
  getReviewsEscalationHandlerAgent,
  getReviewsPatternInsightAgent,
  getReviewsRepairStrategyAgent,
  getReviewsRequestCrafterAgent,
  getReviewsResponseGeneratorAgent,
  getReviewsSentimentAnalyzerAgent,
  getReviewsTestimonialExtractorAgent,
} from "../../../../../../../backend/os-agents/sectors/reviews";

type ReviewsAgentId =
  | "reviews-request-crafter"
  | "reviews-sentiment-analyzer"
  | "reviews-response-generator"
  | "reviews-escalation-handler"
  | "reviews-pattern-insight"
  | "reviews-competitor-benchmark"
  | "reviews-testimonial-extractor"
  | "reviews-repair-strategy";

const IDS: ReviewsAgentId[] = [
  "reviews-request-crafter",
  "reviews-sentiment-analyzer",
  "reviews-response-generator",
  "reviews-escalation-handler",
  "reviews-pattern-insight",
  "reviews-competitor-benchmark",
  "reviews-testimonial-extractor",
  "reviews-repair-strategy",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceReviewsInput(userId: string, raw: unknown): ReviewsInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const platform = typeof raw.platform === "string" ? raw.platform.trim() : "";
  if (!sector || !businessName || !platform) {
    throw new Error("sector, businessName y platform son obligatorios");
  }
  const reviewText = typeof raw.reviewText === "string" ? raw.reviewText : undefined;
  let rating: number | undefined;
  if (raw.rating != null) {
    const n = typeof raw.rating === "number" ? raw.rating : Number(raw.rating);
    if (!Number.isFinite(n)) throw new Error("rating inválido");
    rating = n;
  }
  const language = typeof raw.language === "string" ? raw.language.trim() : undefined;
  return {
    userId,
    sector,
    businessName,
    platform,
    reviewText,
    rating,
    language,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO reviews_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ReviewsAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceReviewsInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ReviewsAgentId) {
      case "reviews-request-crafter":
        result = await getReviewsRequestCrafterAgent().run(input);
        break;
      case "reviews-sentiment-analyzer":
        result = await getReviewsSentimentAnalyzerAgent().run(input);
        break;
      case "reviews-response-generator":
        result = await getReviewsResponseGeneratorAgent().run(input);
        break;
      case "reviews-escalation-handler":
        result = await getReviewsEscalationHandlerAgent().run(input);
        break;
      case "reviews-pattern-insight":
        result = await getReviewsPatternInsightAgent().run(input);
        break;
      case "reviews-competitor-benchmark":
        result = await getReviewsCompetitorBenchmarkAgent().run(input);
        break;
      case "reviews-testimonial-extractor":
        result = await getReviewsTestimonialExtractorAgent().run(input);
        break;
      case "reviews-repair-strategy":
        result = await getReviewsRepairStrategyAgent().run(input);
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
