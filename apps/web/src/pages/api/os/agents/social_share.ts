import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SocialShareInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSocialShareAnalyticsAgent,
  getSocialShareCopyAgent,
  getSocialShareCTAAgent,
  getSocialShareImageAgent,
  getSocialShareSchedulerAgent,
  getSocialShareTemplateAgent,
  getSocialShareTrackerAgent,
  getSocialShareViralAgent,
} from "../../../../../../../backend/os-agents/sectors/social_share";

type SocialShareLibraryAgentId =
  | "social-share-image"
  | "social-share-copy"
  | "social-share-scheduler"
  | "social-share-tracker"
  | "social-share-viral"
  | "social-share-template"
  | "social-share-analytics"
  | "social-share-cta";

const IDS: SocialShareLibraryAgentId[] = [
  "social-share-image",
  "social-share-copy",
  "social-share-scheduler",
  "social-share-tracker",
  "social-share-viral",
  "social-share-template",
  "social-share-analytics",
  "social-share-cta",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceSocialShareInput(userId: string, raw: unknown): SocialShareInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const referralLink = typeof raw.referralLink === "string" ? raw.referralLink.trim() : undefined;
  const primaryNetwork = typeof raw.primaryNetwork === "string" ? raw.primaryNetwork.trim() : undefined;
  const metricsSummary = typeof raw.metricsSummary === "string" ? raw.metricsSummary.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");
  return {
    userId,
    sector,
    brand,
    referralLink: referralLink || undefined,
    primaryNetwork: primaryNetwork || undefined,
    metricsSummary: metricsSummary || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO social_share_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as SocialShareLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceSocialShareInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SocialShareLibraryAgentId) {
      case "social-share-image":
        result = await getSocialShareImageAgent().run(input);
        break;
      case "social-share-copy":
        result = await getSocialShareCopyAgent().run(input);
        break;
      case "social-share-scheduler":
        result = await getSocialShareSchedulerAgent().run(input);
        break;
      case "social-share-tracker":
        result = await getSocialShareTrackerAgent().run(input);
        break;
      case "social-share-viral":
        result = await getSocialShareViralAgent().run(input);
        break;
      case "social-share-template":
        result = await getSocialShareTemplateAgent().run(input);
        break;
      case "social-share-analytics":
        result = await getSocialShareAnalyticsAgent().run(input);
        break;
      case "social-share-cta":
        result = await getSocialShareCTAAgent().run(input);
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
