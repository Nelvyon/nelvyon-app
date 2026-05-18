import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { PodcastInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getPodcastAnalyticsAgent,
  getPodcastAudiogramaAgent,
  getPodcastDistribucionAgent,
  getPodcastEdicionAgent,
  getPodcastGuionAgent,
  getPodcastMusicaAgent,
  getPodcastTranscripcionAgent,
  getPodcastVozAgent,
} from "../../../../../../../backend/os-agents/sectors/podcast";

type PodcastLibraryAgentId =
  | "podcast-guion"
  | "podcast-voz"
  | "podcast-musica"
  | "podcast-edicion"
  | "podcast-transcripcion"
  | "podcast-distribucion"
  | "podcast-audiograma"
  | "podcast-analytics";

const IDS: PodcastLibraryAgentId[] = [
  "podcast-guion",
  "podcast-voz",
  "podcast-musica",
  "podcast-edicion",
  "podcast-transcripcion",
  "podcast-distribucion",
  "podcast-audiograma",
  "podcast-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coercePodcastInput(userId: string, raw: unknown): PodcastInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO podcast_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as PodcastLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coercePodcastInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as PodcastLibraryAgentId) {
      case "podcast-guion":
        result = await getPodcastGuionAgent().run(input);
        break;
      case "podcast-voz":
        result = await getPodcastVozAgent().run(input);
        break;
      case "podcast-musica":
        result = await getPodcastMusicaAgent().run(input);
        break;
      case "podcast-edicion":
        result = await getPodcastEdicionAgent().run(input);
        break;
      case "podcast-transcripcion":
        result = await getPodcastTranscripcionAgent().run(input);
        break;
      case "podcast-distribucion":
        result = await getPodcastDistribucionAgent().run(input);
        break;
      case "podcast-audiograma":
        result = await getPodcastAudiogramaAgent().run(input);
        break;
      case "podcast-analytics":
        result = await getPodcastAnalyticsAgent().run(input);
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
