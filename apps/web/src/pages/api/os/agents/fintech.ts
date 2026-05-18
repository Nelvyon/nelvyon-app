import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { FintechInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getFintechActivacionAgent,
  getFintechAdquisicionAgent,
  getFintechAnalyticsAgent,
  getFintechEmailAgent,
  getFintechPreciosAgent,
  getFintechReviewsAgent,
  getFintechSEOAgent,
  getFintechSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/fintech";

type FintechLibraryAgentId =
  | "fintech-adquisicion"
  | "fintech-activacion"
  | "fintech-precios"
  | "fintech-seo"
  | "fintech-social"
  | "fintech-email"
  | "fintech-reviews"
  | "fintech-analytics";

const IDS: FintechLibraryAgentId[] = [
  "fintech-adquisicion",
  "fintech-activacion",
  "fintech-precios",
  "fintech-seo",
  "fintech-social",
  "fintech-email",
  "fintech-reviews",
  "fintech-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceFintechInput(userId: string, raw: unknown): FintechInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO fintech_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as FintechLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceFintechInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as FintechLibraryAgentId) {
      case "fintech-adquisicion":
        result = await getFintechAdquisicionAgent().run(input);
        break;
      case "fintech-activacion":
        result = await getFintechActivacionAgent().run(input);
        break;
      case "fintech-precios":
        result = await getFintechPreciosAgent().run(input);
        break;
      case "fintech-seo":
        result = await getFintechSEOAgent().run(input);
        break;
      case "fintech-social":
        result = await getFintechSocialAgent().run(input);
        break;
      case "fintech-email":
        result = await getFintechEmailAgent().run(input);
        break;
      case "fintech-reviews":
        result = await getFintechReviewsAgent().run(input);
        break;
      case "fintech-analytics":
        result = await getFintechAnalyticsAgent().run(input);
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
