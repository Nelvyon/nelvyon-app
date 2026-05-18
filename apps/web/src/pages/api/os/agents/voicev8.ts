import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { VoiceV8Input } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getVoiceV8AlertasAgent,
  getVoiceV8AnalisisAgent,
  getVoiceV8BenchmarkAgent,
  getVoiceV8CoachingAgent,
  getVoiceV8HeatmapAgent,
  getVoiceV8ObjecionesAgent,
  getVoiceV8ReportesAgent,
  getVoiceV8ScoringAgent,
} from "../../../../../../../backend/os-agents/sectors/voicev8";

type VoiceV8LibraryAgentId =
  | "voicev8-analisis"
  | "voicev8-scoring"
  | "voicev8-objeciones"
  | "voicev8-coaching"
  | "voicev8-benchmark"
  | "voicev8-reportes"
  | "voicev8-alertas"
  | "voicev8-heatmap";

const IDS: VoiceV8LibraryAgentId[] = [
  "voicev8-analisis",
  "voicev8-scoring",
  "voicev8-objeciones",
  "voicev8-coaching",
  "voicev8-benchmark",
  "voicev8-reportes",
  "voicev8-alertas",
  "voicev8-heatmap",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceVoiceV8Input(userId: string, raw: unknown): VoiceV8Input {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO voicev8_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as VoiceV8LibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceVoiceV8Input(user.userId, body?.input ?? {});

    let result;
    switch (agentId as VoiceV8LibraryAgentId) {
      case "voicev8-analisis":
        result = await getVoiceV8AnalisisAgent().run(input);
        break;
      case "voicev8-scoring":
        result = await getVoiceV8ScoringAgent().run(input);
        break;
      case "voicev8-objeciones":
        result = await getVoiceV8ObjecionesAgent().run(input);
        break;
      case "voicev8-coaching":
        result = await getVoiceV8CoachingAgent().run(input);
        break;
      case "voicev8-benchmark":
        result = await getVoiceV8BenchmarkAgent().run(input);
        break;
      case "voicev8-reportes":
        result = await getVoiceV8ReportesAgent().run(input);
        break;
      case "voicev8-alertas":
        result = await getVoiceV8AlertasAgent().run(input);
        break;
      case "voicev8-heatmap":
        result = await getVoiceV8HeatmapAgent().run(input);
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
