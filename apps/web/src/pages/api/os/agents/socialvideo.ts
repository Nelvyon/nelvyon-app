import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { SocialvideoInput } from "../../../../../../../backend/os-agents/sectors/socialvideo";
import {
  getSocialvideoAnalyticsAgent,
  getSocialvideoCalendarioAgent,
  getSocialvideoDistribucionAgent,
  getSocialvideoEstrategiaAgent,
  getSocialvideoGuionesAgent,
  getSocialvideoProduccionAgent,
  getSocialvideoSubtitulosAgent,
  getSocialvideoTendenciasAgent,
} from "../../../../../../../backend/os-agents/sectors/socialvideo";

type SocialvideoAgentId =
  | "socialvideo-estrategia"
  | "socialvideo-guiones"
  | "socialvideo-calendario"
  | "socialvideo-tendencias"
  | "socialvideo-produccion"
  | "socialvideo-subtitulos"
  | "socialvideo-distribucion"
  | "socialvideo-analytics";

const IDS: SocialvideoAgentId[] = [
  "socialvideo-estrategia",
  "socialvideo-guiones",
  "socialvideo-calendario",
  "socialvideo-tendencias",
  "socialvideo-produccion",
  "socialvideo-subtitulos",
  "socialvideo-distribucion",
  "socialvideo-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceSocialvideoInput(userId: string, agentId: string, raw: unknown): SocialvideoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessContext = typeof raw.businessContext === "string" ? raw.businessContext.trim() : "";
  if (!businessContext) throw new Error("businessContext es obligatorio");
  return { userId, businessContext, agentId };
}

/** Incluye campos opcionales del body (p. ej. metadata) en el jsonb persistido sin ampliar SocialvideoInput en runtime del agente. */
function persistedSocialvideoInput(coerced: SocialvideoInput, raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...coerced };
  if (isRecord(raw) && raw.metadata !== undefined) out.metadata = raw.metadata;
  return out;
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO socialvideo_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as SocialvideoAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const rawInput = body?.input ?? {};
    const input = coerceSocialvideoInput(user.userId, agentId, rawInput);
    const inputForDb = persistedSocialvideoInput(input, rawInput);

    let result;
    switch (agentId as SocialvideoAgentId) {
      case "socialvideo-estrategia":
        result = await getSocialvideoEstrategiaAgent().execute(input);
        break;
      case "socialvideo-guiones":
        result = await getSocialvideoGuionesAgent().execute(input);
        break;
      case "socialvideo-calendario":
        result = await getSocialvideoCalendarioAgent().execute(input);
        break;
      case "socialvideo-tendencias":
        result = await getSocialvideoTendenciasAgent().execute(input);
        break;
      case "socialvideo-produccion":
        result = await getSocialvideoProduccionAgent().execute(input);
        break;
      case "socialvideo-subtitulos":
        result = await getSocialvideoSubtitulosAgent().execute(input);
        break;
      case "socialvideo-distribucion":
        result = await getSocialvideoDistribucionAgent().execute(input);
        break;
      case "socialvideo-analytics":
        result = await getSocialvideoAnalyticsAgent().execute(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, inputForDb, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorio") ||
        e.message.includes("debe ser") ||
        e.message.includes("JSON inválido") ||
        e.message.includes("no soportado");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
