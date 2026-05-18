import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ManufacturaInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getManufacturaAnalyticsAgent,
  getManufacturaEmailAgent,
  getManufacturaExportacionAgent,
  getManufacturaLeadGenAgent,
  getManufacturaPreciosAgent,
  getManufacturaReviewsAgent,
  getManufacturaSEOAgent,
  getManufacturaSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/manufactura";

type ManufacturaLibraryAgentId =
  | "manufactura-lead-gen"
  | "manufactura-exportacion"
  | "manufactura-precios"
  | "manufactura-seo"
  | "manufactura-social"
  | "manufactura-email"
  | "manufactura-reviews"
  | "manufactura-analytics";

const IDS: ManufacturaLibraryAgentId[] = [
  "manufactura-lead-gen",
  "manufactura-exportacion",
  "manufactura-precios",
  "manufactura-seo",
  "manufactura-social",
  "manufactura-email",
  "manufactura-reviews",
  "manufactura-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceManufacturaInput(userId: string, raw: unknown): ManufacturaInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO manufactura_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as ManufacturaLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceManufacturaInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ManufacturaLibraryAgentId) {
      case "manufactura-lead-gen":
        result = await getManufacturaLeadGenAgent().run(input);
        break;
      case "manufactura-exportacion":
        result = await getManufacturaExportacionAgent().run(input);
        break;
      case "manufactura-precios":
        result = await getManufacturaPreciosAgent().run(input);
        break;
      case "manufactura-seo":
        result = await getManufacturaSEOAgent().run(input);
        break;
      case "manufactura-social":
        result = await getManufacturaSocialAgent().run(input);
        break;
      case "manufactura-email":
        result = await getManufacturaEmailAgent().run(input);
        break;
      case "manufactura-reviews":
        result = await getManufacturaReviewsAgent().run(input);
        break;
      case "manufactura-analytics":
        result = await getManufacturaAnalyticsAgent().run(input);
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
