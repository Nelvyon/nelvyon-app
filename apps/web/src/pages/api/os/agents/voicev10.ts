import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { VoiceV10Input } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getVoiceV10AjusteTonalAgent,
  getVoiceV10AlertasAgent,
  getVoiceV10CorrelacionAgent,
  getVoiceV10DeteccionAgent,
  getVoiceV10EscalacionAgent,
  getVoiceV10RegistroAgent,
  getVoiceV10SentimientoAgent,
} from "../../../../../../../backend/os-agents/sectors/voicev10";

type VoiceV10LibraryAgentId =
  | "voicev10-deteccion"
  | "voicev10-ajustetonal"
  | "voicev10-escalacion"
  | "voicev10-registro"
  | "voicev10-alertas"
  | "voicev10-sentimiento"
  | "voicev10-correlacion";

const IDS: VoiceV10LibraryAgentId[] = [
  "voicev10-deteccion",
  "voicev10-ajustetonal",
  "voicev10-escalacion",
  "voicev10-registro",
  "voicev10-alertas",
  "voicev10-sentimiento",
  "voicev10-correlacion",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceVoiceV10Input(userId: string, raw: unknown): VoiceV10Input {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO voicev10_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as VoiceV10LibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceVoiceV10Input(user.userId, body?.input ?? {});

    let result;
    switch (agentId as VoiceV10LibraryAgentId) {
      case "voicev10-deteccion":
        result = await getVoiceV10DeteccionAgent().run(input);
        break;
      case "voicev10-ajustetonal":
        result = await getVoiceV10AjusteTonalAgent().run(input);
        break;
      case "voicev10-escalacion":
        result = await getVoiceV10EscalacionAgent().run(input);
        break;
      case "voicev10-registro":
        result = await getVoiceV10RegistroAgent().run(input);
        break;
      case "voicev10-alertas":
        result = await getVoiceV10AlertasAgent().run(input);
        break;
      case "voicev10-sentimiento":
        result = await getVoiceV10SentimientoAgent().run(input);
        break;
      case "voicev10-correlacion":
        result = await getVoiceV10CorrelacionAgent().run(input);
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
