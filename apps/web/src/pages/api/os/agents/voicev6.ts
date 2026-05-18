import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { VoiceV6Input } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getVoiceV6BalanceoAgent,
  getVoiceV6ColasAgent,
  getVoiceV6CostesAgent,
  getVoiceV6FailoverAgent,
  getVoiceV6MonitoreoAgent,
  getVoiceV6OrquestadorAgent,
  getVoiceV6RateLimitAgent,
  getVoiceV6ScalingAgent,
} from "../../../../../../../backend/os-agents/sectors/voicev6";

type VoiceV6LibraryAgentId =
  | "voicev6-orquestador"
  | "voicev6-balanceo"
  | "voicev6-colas"
  | "voicev6-failover"
  | "voicev6-ratelimit"
  | "voicev6-monitoreo"
  | "voicev6-scaling"
  | "voicev6-costes";

const IDS: VoiceV6LibraryAgentId[] = [
  "voicev6-orquestador",
  "voicev6-balanceo",
  "voicev6-colas",
  "voicev6-failover",
  "voicev6-ratelimit",
  "voicev6-monitoreo",
  "voicev6-scaling",
  "voicev6-costes",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceVoiceV6Input(userId: string, raw: unknown): VoiceV6Input {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO voicev6_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as VoiceV6LibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceVoiceV6Input(user.userId, body?.input ?? {});

    let result;
    switch (agentId as VoiceV6LibraryAgentId) {
      case "voicev6-orquestador":
        result = await getVoiceV6OrquestadorAgent().run(input);
        break;
      case "voicev6-balanceo":
        result = await getVoiceV6BalanceoAgent().run(input);
        break;
      case "voicev6-colas":
        result = await getVoiceV6ColasAgent().run(input);
        break;
      case "voicev6-failover":
        result = await getVoiceV6FailoverAgent().run(input);
        break;
      case "voicev6-ratelimit":
        result = await getVoiceV6RateLimitAgent().run(input);
        break;
      case "voicev6-monitoreo":
        result = await getVoiceV6MonitoreoAgent().run(input);
        break;
      case "voicev6-scaling":
        result = await getVoiceV6ScalingAgent().run(input);
        break;
      case "voicev6-costes":
        result = await getVoiceV6CostesAgent().run(input);
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
