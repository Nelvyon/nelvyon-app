import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { MobileInput, MobilePlatform } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getMobileASORankingAgent,
  getMobileDeepLinkStrategyAgent,
  getMobileInAppMessagingAgent,
  getMobileOnboardingFlowAgent,
  getMobilePushNotificationAgent,
  getMobileRatingRequestAgent,
  getMobileRetentionFlowAgent,
  getMobileRevenueOptimizationAgent,
} from "../../../../../../../backend/os-agents/sectors/mobile";

type MobileLibraryAgentId =
  | "mobile-onboarding-flow"
  | "mobile-push-notification"
  | "mobile-aso-ranking"
  | "mobile-retention-flow"
  | "mobile-in-app-messaging"
  | "mobile-rating-request"
  | "mobile-deep-link-strategy"
  | "mobile-revenue-optimization";

const IDS: MobileLibraryAgentId[] = [
  "mobile-onboarding-flow",
  "mobile-push-notification",
  "mobile-aso-ranking",
  "mobile-retention-flow",
  "mobile-in-app-messaging",
  "mobile-rating-request",
  "mobile-deep-link-strategy",
  "mobile-revenue-optimization",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const PLATFORMS: MobilePlatform[] = ["ios", "android", "both"];

function coerceMobileInput(userId: string, raw: unknown): MobileInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const appName = typeof raw.appName === "string" ? raw.appName.trim() : "";
  const platformRaw = typeof raw.platform === "string" ? raw.platform.trim() : "";
  const targetAudience = typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : "";
  if (!sector || !appName || !targetAudience) {
    throw new Error("sector, appName y targetAudience son obligatorios");
  }
  if (!PLATFORMS.includes(platformRaw as MobilePlatform)) {
    throw new Error("platform debe ser ios, android o both");
  }
  const platform = platformRaw as MobilePlatform;
  const appGoal = typeof raw.appGoal === "string" ? raw.appGoal.trim() : undefined;
  return {
    userId,
    sector,
    appName,
    platform,
    targetAudience,
    appGoal: appGoal || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO mobile_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as MobileLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceMobileInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as MobileLibraryAgentId) {
      case "mobile-onboarding-flow":
        result = await getMobileOnboardingFlowAgent().run(input);
        break;
      case "mobile-push-notification":
        result = await getMobilePushNotificationAgent().run(input);
        break;
      case "mobile-aso-ranking":
        result = await getMobileASORankingAgent().run(input);
        break;
      case "mobile-retention-flow":
        result = await getMobileRetentionFlowAgent().run(input);
        break;
      case "mobile-in-app-messaging":
        result = await getMobileInAppMessagingAgent().run(input);
        break;
      case "mobile-rating-request":
        result = await getMobileRatingRequestAgent().run(input);
        break;
      case "mobile-deep-link-strategy":
        result = await getMobileDeepLinkStrategyAgent().run(input);
        break;
      case "mobile-revenue-optimization":
        result = await getMobileRevenueOptimizationAgent().run(input);
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
