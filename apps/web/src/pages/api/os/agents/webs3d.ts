import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { Webs3dInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getWebs3dAnalyticsAgent,
  getWebs3dClientesAgent,
  getWebs3dEmailAgent,
  getWebs3dPortfolioAgent,
  getWebs3dPreciosAgent,
  getWebs3dReviewsAgent,
  getWebs3dSEOAgent,
  getWebs3dSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/webs3d";

type Webs3dLibraryAgentId =
  | "webs3d-portfolio"
  | "webs3d-clientes"
  | "webs3d-precios"
  | "webs3d-seo"
  | "webs3d-social"
  | "webs3d-email"
  | "webs3d-reviews"
  | "webs3d-analytics";

const IDS: Webs3dLibraryAgentId[] = [
  "webs3d-portfolio",
  "webs3d-clientes",
  "webs3d-precios",
  "webs3d-seo",
  "webs3d-social",
  "webs3d-email",
  "webs3d-reviews",
  "webs3d-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceWebs3dInput(userId: string, raw: unknown): Webs3dInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO webs3d_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as Webs3dLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceWebs3dInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as Webs3dLibraryAgentId) {
      case "webs3d-portfolio":
        result = await getWebs3dPortfolioAgent().run(input);
        break;
      case "webs3d-clientes":
        result = await getWebs3dClientesAgent().run(input);
        break;
      case "webs3d-precios":
        result = await getWebs3dPreciosAgent().run(input);
        break;
      case "webs3d-seo":
        result = await getWebs3dSEOAgent().run(input);
        break;
      case "webs3d-social":
        result = await getWebs3dSocialAgent().run(input);
        break;
      case "webs3d-email":
        result = await getWebs3dEmailAgent().run(input);
        break;
      case "webs3d-reviews":
        result = await getWebs3dReviewsAgent().run(input);
        break;
      case "webs3d-analytics":
        result = await getWebs3dAnalyticsAgent().run(input);
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
