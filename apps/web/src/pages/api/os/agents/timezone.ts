import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { TimezoneId, TimezoneInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getTimezoneAuditAgent,
  getTimezoneCalendarAgent,
  getTimezoneConverterAgent,
  getTimezoneDetectorAgent,
  getTimezoneNotifierAgent,
  getTimezoneOptimalAgent,
  getTimezoneReportAgent,
  getTimezoneSchedulerAgent,
} from "../../../../../../../backend/os-agents/sectors/timezone";

type TimezoneLibraryAgentId =
  | "timezone-detector"
  | "timezone-scheduler"
  | "timezone-converter"
  | "timezone-optimal"
  | "timezone-notifier"
  | "timezone-report"
  | "timezone-calendar"
  | "timezone-audit";

const IDS: TimezoneLibraryAgentId[] = [
  "timezone-detector",
  "timezone-scheduler",
  "timezone-converter",
  "timezone-optimal",
  "timezone-notifier",
  "timezone-report",
  "timezone-calendar",
  "timezone-audit",
];

const TIMEZONE_IDS: TimezoneId[] = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "America/Mexico_City",
  "America/Bogota",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "UTC",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceTimezone(raw: unknown): TimezoneId | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return undefined;
  if (!TIMEZONE_IDS.includes(s as TimezoneId)) {
    throw new Error("preferredTimezone debe ser una zona IANA cubierta");
  }
  return s as TimezoneId;
}

function coerceTimezoneInput(userId: string, raw: unknown): TimezoneInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const countryCode = typeof raw.countryCode === "string" ? raw.countryCode.trim().toUpperCase() : undefined;
  const ipHint = typeof raw.ipHint === "string" ? raw.ipHint.trim() : undefined;
  const referenceTimestamp = typeof raw.referenceTimestamp === "string" ? raw.referenceTimestamp.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  const preferredTimezone = coerceTimezone(raw.preferredTimezone);

  return {
    userId,
    sector,
    brand,
    countryCode: countryCode || undefined,
    ipHint: ipHint || undefined,
    preferredTimezone,
    referenceTimestamp: referenceTimestamp || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO timezone_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as TimezoneLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceTimezoneInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as TimezoneLibraryAgentId) {
      case "timezone-detector":
        result = await getTimezoneDetectorAgent().run(input);
        break;
      case "timezone-scheduler":
        result = await getTimezoneSchedulerAgent().run(input);
        break;
      case "timezone-converter":
        result = await getTimezoneConverterAgent().run(input);
        break;
      case "timezone-optimal":
        result = await getTimezoneOptimalAgent().run(input);
        break;
      case "timezone-notifier":
        result = await getTimezoneNotifierAgent().run(input);
        break;
      case "timezone-report":
        result = await getTimezoneReportAgent().run(input);
        break;
      case "timezone-calendar":
        result = await getTimezoneCalendarAgent().run(input);
        break;
      case "timezone-audit":
        result = await getTimezoneAuditAgent().run(input);
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
