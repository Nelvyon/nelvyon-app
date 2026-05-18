import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { InfluencerInput, InfluencerReachInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getInfluencerAnalyticsAgent,
  getInfluencerAvatarAgent,
  getInfluencerBriefGeneratorAgent,
  getInfluencerCalendarioAgent,
  getInfluencerCampaignReportAgent,
  getInfluencerComunidadAgent,
  getInfluencerContenidoAgent,
  getInfluencerContentCalendarAgent,
  getInfluencerContractTermsAgent,
  getInfluencerDiscoveryAgent,
  getInfluencerFitScorerAgent,
  getInfluencerIdentidadAgent,
  getInfluencerMonetizacionAgent,
  getInfluencerOutreachCrafterAgent,
  getInfluencerROIProjectorAgent,
  getInfluencerVozAgent,
} from "../../../../../../../backend/os-agents/sectors/influencer";

const INFLUENCER_VIRTUAL_SECTOR = "influencer_v1";

type InfluencerReachAgentId =
  | "influencer-discovery"
  | "influencer-fit-scorer"
  | "influencer-outreach-crafter"
  | "influencer-brief-generator"
  | "influencer-contract-terms"
  | "influencer-roi-projector"
  | "influencer-content-calendar"
  | "influencer-campaign-report";

type InfluencerVirtualAgentId =
  | "influencer-identidad"
  | "influencer-contenido"
  | "influencer-avatar"
  | "influencer-voz"
  | "influencer-calendario"
  | "influencer-comunidad"
  | "influencer-monetizacion"
  | "influencer-analytics";

const REACH_IDS: InfluencerReachAgentId[] = [
  "influencer-discovery",
  "influencer-fit-scorer",
  "influencer-outreach-crafter",
  "influencer-brief-generator",
  "influencer-contract-terms",
  "influencer-roi-projector",
  "influencer-content-calendar",
  "influencer-campaign-report",
];

const VIRTUAL_IDS: InfluencerVirtualAgentId[] = [
  "influencer-identidad",
  "influencer-contenido",
  "influencer-avatar",
  "influencer-voz",
  "influencer-calendario",
  "influencer-comunidad",
  "influencer-monetizacion",
  "influencer-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceInfluencerReachInput(userId: string, raw: unknown): InfluencerReachInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const targetAudience = typeof raw.targetAudience === "string" ? raw.targetAudience.trim() : "";
  if (!sector || !brand || !targetAudience) {
    throw new Error("sector, brand y targetAudience son obligatorios");
  }
  const budget = typeof raw.budget === "string" ? raw.budget.trim() : undefined;
  let platforms: string[] | undefined;
  if (raw.platforms != null) {
    if (!Array.isArray(raw.platforms)) throw new Error("platforms debe ser un array");
    platforms = raw.platforms.map((p) => String(p)).filter(Boolean);
  }
  return {
    userId,
    sector,
    brand,
    targetAudience,
    budget: budget || undefined,
    platforms,
  };
}

function coerceOsInfluencerInput(userId: string, raw: unknown): InfluencerInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  let metadata: InfluencerInput["metadata"];
  if (raw.metadata != null && isRecord(raw.metadata)) {
    const program = raw.metadata.program;
    if (typeof program === "string" && program.trim()) {
      metadata = { program: program.trim() };
    }
  }

  return { userId, businessName, services, targets, metadata };
}

async function saveResult(
  userId: string,
  agentId: string,
  sector: string,
  input: unknown,
  output: unknown,
): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO influencer_results (user_id, agent_id, sector, input, output)
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

    const isReach = REACH_IDS.includes(agentId as InfluencerReachAgentId);
    const isVirtual = VIRTUAL_IDS.includes(agentId as InfluencerVirtualAgentId);
    if (!isReach && !isVirtual) return res.status(400).json({ error: "agentId inválido" });

    if (isReach) {
      const input = coerceInfluencerReachInput(user.userId, body?.input ?? {});
      let result;
      switch (agentId as InfluencerReachAgentId) {
        case "influencer-discovery":
          result = await getInfluencerDiscoveryAgent().run(input);
          break;
        case "influencer-fit-scorer":
          result = await getInfluencerFitScorerAgent().run(input);
          break;
        case "influencer-outreach-crafter":
          result = await getInfluencerOutreachCrafterAgent().run(input);
          break;
        case "influencer-brief-generator":
          result = await getInfluencerBriefGeneratorAgent().run(input);
          break;
        case "influencer-contract-terms":
          result = await getInfluencerContractTermsAgent().run(input);
          break;
        case "influencer-roi-projector":
          result = await getInfluencerROIProjectorAgent().run(input);
          break;
        case "influencer-content-calendar":
          result = await getInfluencerContentCalendarAgent().run(input);
          break;
        case "influencer-campaign-report":
          result = await getInfluencerCampaignReportAgent().run(input);
          break;
        default:
          return res.status(400).json({ error: "agentId inválido" });
      }
      await saveResult(user.userId, agentId, input.sector, input, result);
      return res.status(200).json({ result });
    }

    const input = coerceOsInfluencerInput(user.userId, body?.input ?? {});
    let result;
    switch (agentId as InfluencerVirtualAgentId) {
      case "influencer-identidad":
        result = await getInfluencerIdentidadAgent().run(input);
        break;
      case "influencer-contenido":
        result = await getInfluencerContenidoAgent().run(input);
        break;
      case "influencer-avatar":
        result = await getInfluencerAvatarAgent().run(input);
        break;
      case "influencer-voz":
        result = await getInfluencerVozAgent().run(input);
        break;
      case "influencer-calendario":
        result = await getInfluencerCalendarioAgent().run(input);
        break;
      case "influencer-comunidad":
        result = await getInfluencerComunidadAgent().run(input);
        break;
      case "influencer-monetizacion":
        result = await getInfluencerMonetizacionAgent().run(input);
        break;
      case "influencer-analytics":
        result = await getInfluencerAnalyticsAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, INFLUENCER_VIRTUAL_SECTOR, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorios") ||
        e.message.includes("obligatorio") ||
        e.message.includes("debe ser") ||
        e.message.includes("JSON inválido");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
