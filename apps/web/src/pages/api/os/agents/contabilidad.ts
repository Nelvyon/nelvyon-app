import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ContabilidadInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getAuditoriaContableAgent,
  getCierreContableAgent,
  getContabilidadAnalyticsAgent,
  getContabilidadAutomaticaAgent,
  getFacturacionAgent,
  getImpuestosAgent,
  getReconciliacionAgent,
  getTesoreriaAgent,
} from "../../../../../../../backend/os-agents/sectors/contabilidad";

type ContabilidadLibraryAgentId =
  | "contabilidad-contabilidadautomatica"
  | "contabilidad-reconciliacion"
  | "contabilidad-impuestos"
  | "contabilidad-facturacion"
  | "contabilidad-tesoreria"
  | "contabilidad-cierrecontable"
  | "contabilidad-auditoriacontable"
  | "contabilidad-contabilidadanalytics";

const IDS: ContabilidadLibraryAgentId[] = [
  "contabilidad-contabilidadautomatica",
  "contabilidad-reconciliacion",
  "contabilidad-impuestos",
  "contabilidad-facturacion",
  "contabilidad-tesoreria",
  "contabilidad-cierrecontable",
  "contabilidad-auditoriacontable",
  "contabilidad-contabilidadanalytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceContabilidadInput(userId: string, raw: unknown): ContabilidadInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const contabilidadBrief = typeof raw.contabilidadBrief === "string" ? raw.contabilidadBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    contabilidadBrief: contabilidadBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO contabilidad_results (user_id, agent_id, sector, input, output)
     VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb)`,
    [userId, agentId, sector, JSON.stringify(input ?? {}), JSON.stringify(output ?? {})],
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
    if (!IDS.includes(agentId as ContabilidadLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceContabilidadInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ContabilidadLibraryAgentId) {
      case "contabilidad-contabilidadautomatica":
        result = await getContabilidadAutomaticaAgent().run(input);
        break;
      case "contabilidad-reconciliacion":
        result = await getReconciliacionAgent().run(input);
        break;
      case "contabilidad-impuestos":
        result = await getImpuestosAgent().run(input);
        break;
      case "contabilidad-facturacion":
        result = await getFacturacionAgent().run(input);
        break;
      case "contabilidad-tesoreria":
        result = await getTesoreriaAgent().run(input);
        break;
      case "contabilidad-cierrecontable":
        result = await getCierreContableAgent().run(input);
        break;
      case "contabilidad-auditoriacontable":
        result = await getAuditoriaContableAgent().run(input);
        break;
      case "contabilidad-contabilidadanalytics":
        result = await getContabilidadAnalyticsAgent().run(input);
        break;
      default:
        return res.status(400).json({ error: "agentId inválido" });
    }

    await saveResult(user.userId, agentId, input.sector, input, result);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof Error && !e.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        e.message.includes("inválido") ||
        e.message.includes("obligatorios") ||
        e.message.includes("debe ser");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
