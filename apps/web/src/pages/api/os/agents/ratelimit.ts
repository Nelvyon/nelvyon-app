import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { RateLimitInput, RateLimitPlan } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getRateLimitAlerterAgent,
  getRateLimitBudgetAgent,
  getRateLimitEnforcerAgent,
  getRateLimitReportAgent,
  getRateLimitResetAgent,
  getRateLimitThrottleAgent,
  getRateLimitTrackerAgent,
  getRateLimitUpgradeAgent,
} from "../../../../../../../backend/os-agents/sectors/ratelimit";

type RateLimitLibraryAgentId =
  | "ratelimit-enforcer"
  | "ratelimit-tracker"
  | "ratelimit-alerter"
  | "ratelimit-budget"
  | "ratelimit-throttle"
  | "ratelimit-reset"
  | "ratelimit-report"
  | "ratelimit-upgrade";

const IDS: RateLimitLibraryAgentId[] = [
  "ratelimit-enforcer",
  "ratelimit-tracker",
  "ratelimit-alerter",
  "ratelimit-budget",
  "ratelimit-throttle",
  "ratelimit-reset",
  "ratelimit-report",
  "ratelimit-upgrade",
];

const PLANS: RateLimitPlan[] = ["starter", "pro", "agency"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceRateLimitInput(userId: string, raw: unknown): RateLimitInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const planBrief = typeof raw.planBrief === "string" ? raw.planBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let plan: RateLimitPlan | undefined;
  if (raw.plan !== undefined && raw.plan !== null) {
    const p = typeof raw.plan === "string" ? raw.plan.trim().toLowerCase() : "";
    if (p) {
      if (!PLANS.includes(p as RateLimitPlan)) {
        throw new Error("plan debe ser starter, pro o agency");
      }
      plan = p as RateLimitPlan;
    }
  }

  return {
    userId,
    sector,
    brand,
    plan,
    planBrief: planBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO ratelimit_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as RateLimitLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceRateLimitInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as RateLimitLibraryAgentId) {
      case "ratelimit-enforcer":
        result = await getRateLimitEnforcerAgent().run(input);
        break;
      case "ratelimit-tracker":
        result = await getRateLimitTrackerAgent().run(input);
        break;
      case "ratelimit-alerter":
        result = await getRateLimitAlerterAgent().run(input);
        break;
      case "ratelimit-budget":
        result = await getRateLimitBudgetAgent().run(input);
        break;
      case "ratelimit-throttle":
        result = await getRateLimitThrottleAgent().run(input);
        break;
      case "ratelimit-reset":
        result = await getRateLimitResetAgent().run(input);
        break;
      case "ratelimit-report":
        result = await getRateLimitReportAgent().run(input);
        break;
      case "ratelimit-upgrade":
        result = await getRateLimitUpgradeAgent().run(input);
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
