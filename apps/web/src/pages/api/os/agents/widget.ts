import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { WidgetInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getWidgetAnalyticsTrackerAgent,
  getWidgetCustomizationAgent,
  getWidgetLeaderboardEmbedAgent,
  getWidgetLiveCounterAgent,
  getWidgetResultsDisplayAgent,
  getWidgetROICalculatorAgent,
  getWidgetSocialProofBadgeAgent,
  getWidgetTestimonialCarouselAgent,
} from "../../../../../../../backend/os-agents/sectors/widget";

type WidgetLibraryAgentId =
  | "widget-results-display"
  | "widget-social-proof-badge"
  | "widget-live-counter"
  | "widget-testimonial-carousel"
  | "widget-roi-calculator"
  | "widget-leaderboard-embed"
  | "widget-customization"
  | "widget-analytics-tracker";

const IDS: WidgetLibraryAgentId[] = [
  "widget-results-display",
  "widget-social-proof-badge",
  "widget-live-counter",
  "widget-testimonial-carousel",
  "widget-roi-calculator",
  "widget-leaderboard-embed",
  "widget-customization",
  "widget-analytics-tracker",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetrics(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function coerceWidgetInput(userId: string, raw: unknown): WidgetInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  if (!sector || !brand) {
    throw new Error("sector y brand son obligatorios");
  }
  const metrics = coerceMetrics(raw.metrics);
  const widgetType = typeof raw.widgetType === "string" ? raw.widgetType.trim() : undefined;
  const embedTarget = typeof raw.embedTarget === "string" ? raw.embedTarget.trim() : undefined;
  return {
    userId,
    sector,
    brand,
    metrics,
    widgetType: widgetType || undefined,
    embedTarget: embedTarget || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO widget_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as WidgetLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceWidgetInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as WidgetLibraryAgentId) {
      case "widget-results-display":
        result = await getWidgetResultsDisplayAgent().run(input);
        break;
      case "widget-social-proof-badge":
        result = await getWidgetSocialProofBadgeAgent().run(input);
        break;
      case "widget-live-counter":
        result = await getWidgetLiveCounterAgent().run(input);
        break;
      case "widget-testimonial-carousel":
        result = await getWidgetTestimonialCarouselAgent().run(input);
        break;
      case "widget-roi-calculator":
        result = await getWidgetROICalculatorAgent().run(input);
        break;
      case "widget-leaderboard-embed":
        result = await getWidgetLeaderboardEmbedAgent().run(input);
        break;
      case "widget-customization":
        result = await getWidgetCustomizationAgent().run(input);
        break;
      case "widget-analytics-tracker":
        result = await getWidgetAnalyticsTrackerAgent().run(input);
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
