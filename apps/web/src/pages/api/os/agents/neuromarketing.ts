import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { NeuromarketingInput } from "../../../../../../../backend/os-agents/sectors/neuromarketing";
import {
  getNeuromarketingCopyAgent,
  getNeuromarketingConversionAgent,
  getNeuromarketingEmocionesAgent,
  getNeuromarketingPersonalidadAgent,
  getNeuromarketingPricingAgent,
  getNeuromarketingSesgosAgent,
  getNeuromarketingTestingAgent,
  getNeuromarketingUxAgent,
} from "../../../../../../../backend/os-agents/sectors/neuromarketing";

type NeuromarketingAgentId =
  | "neuromarketing-sesgos"
  | "neuromarketing-copy"
  | "neuromarketing-pricing"
  | "neuromarketing-ux"
  | "neuromarketing-emociones"
  | "neuromarketing-conversion"
  | "neuromarketing-testing"
  | "neuromarketing-personalidad";

const IDS: NeuromarketingAgentId[] = [
  "neuromarketing-sesgos",
  "neuromarketing-copy",
  "neuromarketing-pricing",
  "neuromarketing-ux",
  "neuromarketing-emociones",
  "neuromarketing-conversion",
  "neuromarketing-testing",
  "neuromarketing-personalidad",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceNeuromarketingInput(userId: string, agentId: string, raw: unknown): NeuromarketingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessContext = typeof raw.businessContext === "string" ? raw.businessContext.trim() : "";
  if (!businessContext) throw new Error("businessContext es obligatorio");
  return { userId, businessContext, agentId };
}

/** Incluye campos opcionales del body (p. ej. metadata) en el jsonb persistido sin ampliar NeuromarketingInput en runtime del agente. */
function persistedNeuromarketingInput(coerced: NeuromarketingInput, raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...coerced };
  if (isRecord(raw) && raw.metadata !== undefined) out.metadata = raw.metadata;
  return out;
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO neuromarketing_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as NeuromarketingAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const rawInput = body?.input ?? {};
    const input = coerceNeuromarketingInput(user.userId, agentId, rawInput);
    const inputForDb = persistedNeuromarketingInput(input, rawInput);

    let result;
    switch (agentId as NeuromarketingAgentId) {
      case "neuromarketing-sesgos":
        result = await getNeuromarketingSesgosAgent().execute(input);
        break;
      case "neuromarketing-copy":
        result = await getNeuromarketingCopyAgent().execute(input);
        break;
      case "neuromarketing-pricing":
        result = await getNeuromarketingPricingAgent().execute(input);
        break;
      case "neuromarketing-ux":
        result = await getNeuromarketingUxAgent().execute(input);
        break;
      case "neuromarketing-emociones":
        result = await getNeuromarketingEmocionesAgent().execute(input);
        break;
      case "neuromarketing-conversion":
        result = await getNeuromarketingConversionAgent().execute(input);
        break;
      case "neuromarketing-testing":
        result = await getNeuromarketingTestingAgent().execute(input);
        break;
      case "neuromarketing-personalidad":
        result = await getNeuromarketingPersonalidadAgent().execute(input);
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
