import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { GCalZoomInput, GCalZoomMeetingType } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getGCalZoomAnalyticsAgent,
  getGCalZoomAuthAgent,
  getGCalZoomFollowUpAgent,
  getGCalZoomRecorderAgent,
  getGCalZoomReminderAgent,
  getGCalZoomSchedulerAgent,
  getGCalZoomSyncAgent,
  getGCalZoomTemplateAgent,
} from "../../../../../../../backend/os-agents/sectors/gcalzoom";

type GCalZoomLibraryAgentId =
  | "gcalzoom-auth"
  | "gcalzoom-scheduler"
  | "gcalzoom-reminder"
  | "gcalzoom-recorder"
  | "gcalzoom-sync"
  | "gcalzoom-followup"
  | "gcalzoom-analytics"
  | "gcalzoom-template";

const IDS: GCalZoomLibraryAgentId[] = [
  "gcalzoom-auth",
  "gcalzoom-scheduler",
  "gcalzoom-reminder",
  "gcalzoom-recorder",
  "gcalzoom-sync",
  "gcalzoom-followup",
  "gcalzoom-analytics",
  "gcalzoom-template",
];

const MEETING_TYPES: GCalZoomMeetingType[] = ["demo", "onboarding", "review_mensual", "upsell", "soporte"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceGCalZoomInput(userId: string, raw: unknown): GCalZoomInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const meetingBrief = typeof raw.meetingBrief === "string" ? raw.meetingBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  let meetingType: GCalZoomMeetingType | undefined;
  if (raw.meetingType !== undefined && raw.meetingType !== null) {
    const m = typeof raw.meetingType === "string" ? raw.meetingType.trim().toLowerCase() : "";
    if (m) {
      if (!MEETING_TYPES.includes(m as GCalZoomMeetingType)) {
        throw new Error("meetingType debe ser demo, onboarding, review_mensual, upsell o soporte");
      }
      meetingType = m as GCalZoomMeetingType;
    }
  }

  return {
    userId,
    sector,
    brand,
    meetingType,
    meetingBrief: meetingBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO gcalzoom_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as GCalZoomLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceGCalZoomInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as GCalZoomLibraryAgentId) {
      case "gcalzoom-auth":
        result = await getGCalZoomAuthAgent().run(input);
        break;
      case "gcalzoom-scheduler":
        result = await getGCalZoomSchedulerAgent().run(input);
        break;
      case "gcalzoom-reminder":
        result = await getGCalZoomReminderAgent().run(input);
        break;
      case "gcalzoom-recorder":
        result = await getGCalZoomRecorderAgent().run(input);
        break;
      case "gcalzoom-sync":
        result = await getGCalZoomSyncAgent().run(input);
        break;
      case "gcalzoom-followup":
        result = await getGCalZoomFollowUpAgent().run(input);
        break;
      case "gcalzoom-analytics":
        result = await getGCalZoomAnalyticsAgent().run(input);
        break;
      case "gcalzoom-template":
        result = await getGCalZoomTemplateAgent().run(input);
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
