import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { VideoMarketingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getVideoMarketingDistribucionAgent,
  getVideoMarketingFormatsAgent,
  getVideoMarketingGeneracionAgent,
  getVideoMarketingGuionAgent,
  getVideoMarketingMusicaAgent,
  getVideoMarketingPresentadorAgent,
  getVideoMarketingThumbnailAgent,
  getVideoMarketingVozAgent,
} from "../../../../../../../backend/os-agents/sectors/videomarketing";

type VideoMarketingLibraryAgentId =
  | "videomarketing-guion"
  | "videomarketing-generacion"
  | "videomarketing-presentador"
  | "videomarketing-voz"
  | "videomarketing-musica"
  | "videomarketing-formats"
  | "videomarketing-thumbnail"
  | "videomarketing-distribucion";

const IDS: VideoMarketingLibraryAgentId[] = [
  "videomarketing-guion",
  "videomarketing-generacion",
  "videomarketing-presentador",
  "videomarketing-voz",
  "videomarketing-musica",
  "videomarketing-formats",
  "videomarketing-thumbnail",
  "videomarketing-distribucion",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceVideoMarketingInput(userId: string, raw: unknown): VideoMarketingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO videomarketing_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as VideoMarketingLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceVideoMarketingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as VideoMarketingLibraryAgentId) {
      case "videomarketing-guion":
        result = await getVideoMarketingGuionAgent().run(input);
        break;
      case "videomarketing-generacion":
        result = await getVideoMarketingGeneracionAgent().run(input);
        break;
      case "videomarketing-presentador":
        result = await getVideoMarketingPresentadorAgent().run(input);
        break;
      case "videomarketing-voz":
        result = await getVideoMarketingVozAgent().run(input);
        break;
      case "videomarketing-musica":
        result = await getVideoMarketingMusicaAgent().run(input);
        break;
      case "videomarketing-formats":
        result = await getVideoMarketingFormatsAgent().run(input);
        break;
      case "videomarketing-thumbnail":
        result = await getVideoMarketingThumbnailAgent().run(input);
        break;
      case "videomarketing-distribucion":
        result = await getVideoMarketingDistribucionAgent().run(input);
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
        e.message.includes("debe ser") ||
        e.message.includes("JSON inválido");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
