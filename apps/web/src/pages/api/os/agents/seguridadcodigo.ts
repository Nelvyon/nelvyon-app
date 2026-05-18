import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { SeguridadCodigoInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getSeguridadCodigoAnalyticsAgent,
  getSeguridadCodigoAntiDebugAgent,
  getSeguridadCodigoApiAgent,
  getSeguridadCodigoAuditAgent,
  getSeguridadCodigoBotsAgent,
  getSeguridadCodigoHardeningAgent,
  getSeguridadCodigoLicenciasAgent,
  getSeguridadCodigoOfuscacionAgent,
} from "../../../../../../../backend/os-agents/sectors/seguridadcodigo";

type SeguridadCodigoLibraryAgentId =
  | "seguridadcodigo-ofuscacion"
  | "seguridadcodigo-antidebug"
  | "seguridadcodigo-licencias"
  | "seguridadcodigo-api"
  | "seguridadcodigo-bots"
  | "seguridadcodigo-audit"
  | "seguridadcodigo-hardening"
  | "seguridadcodigo-analytics";

const IDS: SeguridadCodigoLibraryAgentId[] = [
  "seguridadcodigo-ofuscacion",
  "seguridadcodigo-antidebug",
  "seguridadcodigo-licencias",
  "seguridadcodigo-api",
  "seguridadcodigo-bots",
  "seguridadcodigo-audit",
  "seguridadcodigo-hardening",
  "seguridadcodigo-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceSeguridadCodigoInput(userId: string, raw: unknown): SeguridadCodigoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO seguridadcodigo_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as SeguridadCodigoLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceSeguridadCodigoInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as SeguridadCodigoLibraryAgentId) {
      case "seguridadcodigo-ofuscacion":
        result = await getSeguridadCodigoOfuscacionAgent().run(input);
        break;
      case "seguridadcodigo-antidebug":
        result = await getSeguridadCodigoAntiDebugAgent().run(input);
        break;
      case "seguridadcodigo-licencias":
        result = await getSeguridadCodigoLicenciasAgent().run(input);
        break;
      case "seguridadcodigo-api":
        result = await getSeguridadCodigoApiAgent().run(input);
        break;
      case "seguridadcodigo-bots":
        result = await getSeguridadCodigoBotsAgent().run(input);
        break;
      case "seguridadcodigo-audit":
        result = await getSeguridadCodigoAuditAgent().run(input);
        break;
      case "seguridadcodigo-hardening":
        result = await getSeguridadCodigoHardeningAgent().run(input);
        break;
      case "seguridadcodigo-analytics":
        result = await getSeguridadCodigoAnalyticsAgent().run(input);
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
