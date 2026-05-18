import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { PwaInput } from "../../../../../../../backend/os-agents/sectors/pwa";
import {
  getPwaAuditoriaAgent,
  getPwaInstalacionAgent,
  getPwaNotificacionesAgent,
  getPwaOfflineAgent,
  getPwaPerformanceAgent,
  getPwaResponsiveAgent,
  getPwaServiceWorkerAgent,
  getPwaSincronizacionAgent,
} from "../../../../../../../backend/os-agents/sectors/pwa";

type PwaAgentId =
  | "pwa-auditoria"
  | "pwa-serviceWorker"
  | "pwa-offline"
  | "pwa-notificaciones"
  | "pwa-instalacion"
  | "pwa-performance"
  | "pwa-sincronizacion"
  | "pwa-responsive";

const IDS: PwaAgentId[] = [
  "pwa-auditoria",
  "pwa-serviceWorker",
  "pwa-offline",
  "pwa-notificaciones",
  "pwa-instalacion",
  "pwa-performance",
  "pwa-sincronizacion",
  "pwa-responsive",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coercePwaInput(userId: string, agentId: string, raw: unknown): PwaInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessContext = typeof raw.businessContext === "string" ? raw.businessContext.trim() : "";
  if (!businessContext) throw new Error("businessContext es obligatorio");
  return { userId, businessContext, agentId };
}

/** Incluye campos opcionales del body (p. ej. metadata) en el jsonb persistido sin ampliar PwaInput en runtime del agente. */
function persistedPwaInput(coerced: PwaInput, raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...coerced };
  if (isRecord(raw) && raw.metadata !== undefined) out.metadata = raw.metadata;
  return out;
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO pwa_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as PwaAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const rawInput = body?.input ?? {};
    const input = coercePwaInput(user.userId, agentId, rawInput);
    const inputForDb = persistedPwaInput(input, rawInput);

    let result;
    switch (agentId as PwaAgentId) {
      case "pwa-auditoria":
        result = await getPwaAuditoriaAgent().execute(input);
        break;
      case "pwa-serviceWorker":
        result = await getPwaServiceWorkerAgent().execute(input);
        break;
      case "pwa-offline":
        result = await getPwaOfflineAgent().execute(input);
        break;
      case "pwa-notificaciones":
        result = await getPwaNotificacionesAgent().execute(input);
        break;
      case "pwa-instalacion":
        result = await getPwaInstalacionAgent().execute(input);
        break;
      case "pwa-performance":
        result = await getPwaPerformanceAgent().execute(input);
        break;
      case "pwa-sincronizacion":
        result = await getPwaSincronizacionAgent().execute(input);
        break;
      case "pwa-responsive":
        result = await getPwaResponsiveAgent().execute(input);
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
