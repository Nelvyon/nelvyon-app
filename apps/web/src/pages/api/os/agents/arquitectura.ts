import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ArquitecturaInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getArquitecturaAnalyticsAgent,
  getArquitecturaClientesAgent,
  getArquitecturaEmailAgent,
  getArquitecturaPortfolioAgent,
  getArquitecturaPreciosAgent,
  getArquitecturaReviewsAgent,
  getArquitecturaSEOAgent,
  getArquitecturaSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/arquitectura";

type ArquitecturaLibraryAgentId =
  | "arquitectura-portfolio"
  | "arquitectura-clientes"
  | "arquitectura-precios"
  | "arquitectura-seo"
  | "arquitectura-social"
  | "arquitectura-email"
  | "arquitectura-reviews"
  | "arquitectura-analytics";

const IDS: ArquitecturaLibraryAgentId[] = [
  "arquitectura-portfolio",
  "arquitectura-clientes",
  "arquitectura-precios",
  "arquitectura-seo",
  "arquitectura-social",
  "arquitectura-email",
  "arquitectura-reviews",
  "arquitectura-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceArquitecturaInput(userId: string, raw: unknown): ArquitecturaInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO arquitectura_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as ArquitecturaLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceArquitecturaInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ArquitecturaLibraryAgentId) {
      case "arquitectura-portfolio":
        result = await getArquitecturaPortfolioAgent().run(input);
        break;
      case "arquitectura-clientes":
        result = await getArquitecturaClientesAgent().run(input);
        break;
      case "arquitectura-precios":
        result = await getArquitecturaPreciosAgent().run(input);
        break;
      case "arquitectura-seo":
        result = await getArquitecturaSEOAgent().run(input);
        break;
      case "arquitectura-social":
        result = await getArquitecturaSocialAgent().run(input);
        break;
      case "arquitectura-email":
        result = await getArquitecturaEmailAgent().run(input);
        break;
      case "arquitectura-reviews":
        result = await getArquitecturaReviewsAgent().run(input);
        break;
      case "arquitectura-analytics":
        result = await getArquitecturaAnalyticsAgent().run(input);
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
