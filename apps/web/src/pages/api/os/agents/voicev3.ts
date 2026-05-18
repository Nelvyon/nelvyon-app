import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { VoiceV3Input } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getVoiceV3AnalyticsAgent,
  getVoiceV3CierreAgent,
  getVoiceV3ContratoAgent,
  getVoiceV3FirmaAgent,
  getVoiceV3FollowUpAgent,
  getVoiceV3ObjecionesAgent,
  getVoiceV3PropuestaAgent,
  getVoiceV3UpsellAgent,
} from "../../../../../../../backend/os-agents/sectors/voicev3";

type VoiceV3LibraryAgentId =
  | "voicev3-cierre"
  | "voicev3-objeciones"
  | "voicev3-propuesta"
  | "voicev3-contrato"
  | "voicev3-firma"
  | "voicev3-followup"
  | "voicev3-upsell"
  | "voicev3-analytics";

const IDS: VoiceV3LibraryAgentId[] = [
  "voicev3-cierre",
  "voicev3-objeciones",
  "voicev3-propuesta",
  "voicev3-contrato",
  "voicev3-firma",
  "voicev3-followup",
  "voicev3-upsell",
  "voicev3-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceVoiceV3Input(userId: string, raw: unknown): VoiceV3Input {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO voicev3_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as VoiceV3LibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceVoiceV3Input(user.userId, body?.input ?? {});

    let result;
    switch (agentId as VoiceV3LibraryAgentId) {
      case "voicev3-cierre":
        result = await getVoiceV3CierreAgent().run(input);
        break;
      case "voicev3-objeciones":
        result = await getVoiceV3ObjecionesAgent().run(input);
        break;
      case "voicev3-propuesta":
        result = await getVoiceV3PropuestaAgent().run(input);
        break;
      case "voicev3-contrato":
        result = await getVoiceV3ContratoAgent().run(input);
        break;
      case "voicev3-firma":
        result = await getVoiceV3FirmaAgent().run(input);
        break;
      case "voicev3-followup":
        result = await getVoiceV3FollowUpAgent().run(input);
        break;
      case "voicev3-upsell":
        result = await getVoiceV3UpsellAgent().run(input);
        break;
      case "voicev3-analytics":
        result = await getVoiceV3AnalyticsAgent().run(input);
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
