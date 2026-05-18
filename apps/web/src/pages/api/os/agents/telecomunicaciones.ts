import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { TelecomunicacionesInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getTelecomAdquisicionAgent,
  getTelecomAnalyticsAgent,
  getTelecomEmailAgent,
  getTelecomPreciosAgent,
  getTelecomRetencionAgent,
  getTelecomReviewsAgent,
  getTelecomSEOAgent,
  getTelecomSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/telecomunicaciones";

type TelecomunicacionesLibraryAgentId =
  | "telecomunicaciones-adquisicion"
  | "telecomunicaciones-retencion"
  | "telecomunicaciones-precios"
  | "telecomunicaciones-seo"
  | "telecomunicaciones-social"
  | "telecomunicaciones-email"
  | "telecomunicaciones-reviews"
  | "telecomunicaciones-analytics";

const IDS: TelecomunicacionesLibraryAgentId[] = [
  "telecomunicaciones-adquisicion",
  "telecomunicaciones-retencion",
  "telecomunicaciones-precios",
  "telecomunicaciones-seo",
  "telecomunicaciones-social",
  "telecomunicaciones-email",
  "telecomunicaciones-reviews",
  "telecomunicaciones-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceTelecomunicacionesInput(userId: string, raw: unknown): TelecomunicacionesInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO telecomunicaciones_results (user_id, agent_id, input, output)
     VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)`,
    [userId, agentId, JSON.stringify(input ?? {}), JSON.stringify(output ?? {})],
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
    if (!IDS.includes(agentId as TelecomunicacionesLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceTelecomunicacionesInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as TelecomunicacionesLibraryAgentId) {
      case "telecomunicaciones-adquisicion":
        result = await getTelecomAdquisicionAgent().run(input);
        break;
      case "telecomunicaciones-retencion":
        result = await getTelecomRetencionAgent().run(input);
        break;
      case "telecomunicaciones-precios":
        result = await getTelecomPreciosAgent().run(input);
        break;
      case "telecomunicaciones-seo":
        result = await getTelecomSEOAgent().run(input);
        break;
      case "telecomunicaciones-social":
        result = await getTelecomSocialAgent().run(input);
        break;
      case "telecomunicaciones-email":
        result = await getTelecomEmailAgent().run(input);
        break;
      case "telecomunicaciones-reviews":
        result = await getTelecomReviewsAgent().run(input);
        break;
      case "telecomunicaciones-analytics":
        result = await getTelecomAnalyticsAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorio") ||
        e.message.includes("debe ser");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
