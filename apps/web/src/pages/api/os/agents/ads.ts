import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { AdsInput } from "../../../../../../../backend/os-agents/sectors/ads";
import {
  getAdsAttributionAgent,
  getAdsAudienciasAgent,
  getAdsCreatividadesAgent,
  getAdsEstrategiaAgent,
  getAdsGoogleAgent,
  getAdsMetaAgent,
  getAdsOptimizacionAgent,
  getAdsTiktokAgent,
} from "../../../../../../../backend/os-agents/sectors/ads";

type AdsAgentId =
  | "ads-estrategia"
  | "ads-google"
  | "ads-meta"
  | "ads-tiktok"
  | "ads-audiencias"
  | "ads-creatividades"
  | "ads-attribution"
  | "ads-optimizacion";

const IDS: AdsAgentId[] = [
  "ads-estrategia",
  "ads-google",
  "ads-meta",
  "ads-tiktok",
  "ads-audiencias",
  "ads-creatividades",
  "ads-attribution",
  "ads-optimizacion",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceAdsInput(userId: string, agentId: string, raw: unknown): AdsInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessContext = typeof raw.businessContext === "string" ? raw.businessContext.trim() : "";
  if (!businessContext) throw new Error("businessContext es obligatorio");
  return { userId, businessContext, agentId };
}

/** Incluye campos opcionales del body (p. ej. metadata) en el jsonb persistido sin ampliar AdsInput en runtime del agente. */
function persistedAdsInput(coerced: AdsInput, raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...coerced };
  if (isRecord(raw) && raw.metadata !== undefined) out.metadata = raw.metadata;
  return out;
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO ads_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as AdsAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const rawInput = body?.input ?? {};
    const input = coerceAdsInput(user.userId, agentId, rawInput);
    const inputForDb = persistedAdsInput(input, rawInput);

    let result;
    switch (agentId as AdsAgentId) {
      case "ads-estrategia":
        result = await getAdsEstrategiaAgent().execute(input);
        break;
      case "ads-google":
        result = await getAdsGoogleAgent().execute(input);
        break;
      case "ads-meta":
        result = await getAdsMetaAgent().execute(input);
        break;
      case "ads-tiktok":
        result = await getAdsTiktokAgent().execute(input);
        break;
      case "ads-audiencias":
        result = await getAdsAudienciasAgent().execute(input);
        break;
      case "ads-creatividades":
        result = await getAdsCreatividadesAgent().execute(input);
        break;
      case "ads-attribution":
        result = await getAdsAttributionAgent().execute(input);
        break;
      case "ads-optimizacion":
        result = await getAdsOptimizacionAgent().execute(input);
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
