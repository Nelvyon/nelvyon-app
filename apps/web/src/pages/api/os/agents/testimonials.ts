import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { TestimonialsInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getTestimonialsCaseStudyBuilderAgent,
  getTestimonialsComparisonAgent,
  getTestimonialsDistributionAgent,
  getTestimonialsOutreachRequestAgent,
  getTestimonialsQuoteExtractorAgent,
  getTestimonialsROICalculatorAgent,
  getTestimonialsSocialProofAgent,
  getTestimonialsVideoScriptAgent,
} from "../../../../../../../backend/os-agents/sectors/testimonials";

type TestimonialsLibraryAgentId =
  | "testimonials-case-study-builder"
  | "testimonials-quote-extractor"
  | "testimonials-video-script"
  | "testimonials-social-proof"
  | "testimonials-outreach-request"
  | "testimonials-roi-calculator"
  | "testimonials-comparison"
  | "testimonials-distribution";

const IDS: TestimonialsLibraryAgentId[] = [
  "testimonials-case-study-builder",
  "testimonials-quote-extractor",
  "testimonials-video-script",
  "testimonials-social-proof",
  "testimonials-outreach-request",
  "testimonials-roi-calculator",
  "testimonials-comparison",
  "testimonials-distribution",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceTestimonialsInput(userId: string, raw: unknown): TestimonialsInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const clientName = typeof raw.clientName === "string" ? raw.clientName.trim() : "";
  if (!sector || !clientName) {
    throw new Error("sector y clientName son obligatorios");
  }
  const result = typeof raw.result === "string" ? raw.result.trim() : undefined;
  const industry = typeof raw.industry === "string" ? raw.industry.trim() : undefined;
  const challenge = typeof raw.challenge === "string" ? raw.challenge.trim() : undefined;
  const solution = typeof raw.solution === "string" ? raw.solution.trim() : undefined;
  return {
    userId,
    sector,
    clientName,
    result: result || undefined,
    industry: industry || undefined,
    challenge: challenge || undefined,
    solution: solution || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO testimonials_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as TestimonialsLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceTestimonialsInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as TestimonialsLibraryAgentId) {
      case "testimonials-case-study-builder":
        result = await getTestimonialsCaseStudyBuilderAgent().run(input);
        break;
      case "testimonials-quote-extractor":
        result = await getTestimonialsQuoteExtractorAgent().run(input);
        break;
      case "testimonials-video-script":
        result = await getTestimonialsVideoScriptAgent().run(input);
        break;
      case "testimonials-social-proof":
        result = await getTestimonialsSocialProofAgent().run(input);
        break;
      case "testimonials-outreach-request":
        result = await getTestimonialsOutreachRequestAgent().run(input);
        break;
      case "testimonials-roi-calculator":
        result = await getTestimonialsROICalculatorAgent().run(input);
        break;
      case "testimonials-comparison":
        result = await getTestimonialsComparisonAgent().run(input);
        break;
      case "testimonials-distribution":
        result = await getTestimonialsDistributionAgent().run(input);
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
