import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { VoiceV4Input } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getVoiceV4AnalyticsAgent,
  getVoiceV4ChatAgent,
  getVoiceV4ContinuidadAgent,
  getVoiceV4EmailAgent,
  getVoiceV4EscalacionAgent,
  getVoiceV4HandoffAgent,
  getVoiceV4TransferenciaAgent,
  getVoiceV4WhatsAppAgent,
} from "../../../../../../../backend/os-agents/sectors/voicev4";

type VoiceV4LibraryAgentId =
  | "voicev4-transferencia"
  | "voicev4-handoff"
  | "voicev4-continuidad"
  | "voicev4-whatsapp"
  | "voicev4-email"
  | "voicev4-chat"
  | "voicev4-escalacion"
  | "voicev4-analytics";

const IDS: VoiceV4LibraryAgentId[] = [
  "voicev4-transferencia",
  "voicev4-handoff",
  "voicev4-continuidad",
  "voicev4-whatsapp",
  "voicev4-email",
  "voicev4-chat",
  "voicev4-escalacion",
  "voicev4-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceVoiceV4Input(userId: string, raw: unknown): VoiceV4Input {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO voicev4_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as VoiceV4LibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceVoiceV4Input(user.userId, body?.input ?? {});

    let result;
    switch (agentId as VoiceV4LibraryAgentId) {
      case "voicev4-transferencia":
        result = await getVoiceV4TransferenciaAgent().run(input);
        break;
      case "voicev4-handoff":
        result = await getVoiceV4HandoffAgent().run(input);
        break;
      case "voicev4-continuidad":
        result = await getVoiceV4ContinuidadAgent().run(input);
        break;
      case "voicev4-whatsapp":
        result = await getVoiceV4WhatsAppAgent().run(input);
        break;
      case "voicev4-email":
        result = await getVoiceV4EmailAgent().run(input);
        break;
      case "voicev4-chat":
        result = await getVoiceV4ChatAgent().run(input);
        break;
      case "voicev4-escalacion":
        result = await getVoiceV4EscalacionAgent().run(input);
        break;
      case "voicev4-analytics":
        result = await getVoiceV4AnalyticsAgent().run(input);
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
