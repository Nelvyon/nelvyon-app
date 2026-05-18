import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ProductAnalyticsInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getDAUMAUAgent,
  getEventTrackingAgent,
  getExperimentAnalyticsAgent,
  getFeatureAdoptionAgent,
  getFunnelAnalyticsAgent,
  getPredictiveProductAgent,
  getRetentionAnalyticsAgent,
  getUserJourneyAgent,
} from "../../../../../../../backend/os-agents/sectors/productanalytics";

type ProductAnalyticsLibraryAgentId =
  | "productanalytics-eventtracking"
  | "productanalytics-funnelanalytics"
  | "productanalytics-retentionanalytics"
  | "productanalytics-featureadoption"
  | "productanalytics-userjourney"
  | "productanalytics-daumau"
  | "productanalytics-experimentanalytics"
  | "productanalytics-predictiveproduct";

const IDS: ProductAnalyticsLibraryAgentId[] = [
  "productanalytics-eventtracking",
  "productanalytics-funnelanalytics",
  "productanalytics-retentionanalytics",
  "productanalytics-featureadoption",
  "productanalytics-userjourney",
  "productanalytics-daumau",
  "productanalytics-experimentanalytics",
  "productanalytics-predictiveproduct",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceProductAnalyticsInput(userId: string, raw: unknown): ProductAnalyticsInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const productAnalyticsBrief =
    typeof raw.productAnalyticsBrief === "string" ? raw.productAnalyticsBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    productAnalyticsBrief: productAnalyticsBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO productanalytics_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ProductAnalyticsLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceProductAnalyticsInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ProductAnalyticsLibraryAgentId) {
      case "productanalytics-eventtracking":
        result = await getEventTrackingAgent().run(input);
        break;
      case "productanalytics-funnelanalytics":
        result = await getFunnelAnalyticsAgent().run(input);
        break;
      case "productanalytics-retentionanalytics":
        result = await getRetentionAnalyticsAgent().run(input);
        break;
      case "productanalytics-featureadoption":
        result = await getFeatureAdoptionAgent().run(input);
        break;
      case "productanalytics-userjourney":
        result = await getUserJourneyAgent().run(input);
        break;
      case "productanalytics-daumau":
        result = await getDAUMAUAgent().run(input);
        break;
      case "productanalytics-experimentanalytics":
        result = await getExperimentAnalyticsAgent().run(input);
        break;
      case "productanalytics-predictiveproduct":
        result = await getPredictiveProductAgent().run(input);
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
