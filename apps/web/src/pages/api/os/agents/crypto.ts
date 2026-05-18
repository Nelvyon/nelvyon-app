import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { CryptoInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getCryptoAnalyticsAgent,
  getCryptoComunidadAgent,
  getCryptoEmailAgent,
  getCryptoLaunchAgent,
  getCryptoPreciosAgent,
  getCryptoReviewsAgent,
  getCryptoSEOAgent,
  getCryptoSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/crypto";

type CryptoLibraryAgentId =
  | "crypto-comunidad"
  | "crypto-launch"
  | "crypto-precios"
  | "crypto-seo"
  | "crypto-social"
  | "crypto-email"
  | "crypto-reviews"
  | "crypto-analytics";

const IDS: CryptoLibraryAgentId[] = [
  "crypto-comunidad",
  "crypto-launch",
  "crypto-precios",
  "crypto-seo",
  "crypto-social",
  "crypto-email",
  "crypto-reviews",
  "crypto-analytics",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceCryptoInput(userId: string, raw: unknown): CryptoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO crypto_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as CryptoLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceCryptoInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as CryptoLibraryAgentId) {
      case "crypto-comunidad":
        result = await getCryptoComunidadAgent().run(input);
        break;
      case "crypto-launch":
        result = await getCryptoLaunchAgent().run(input);
        break;
      case "crypto-precios":
        result = await getCryptoPreciosAgent().run(input);
        break;
      case "crypto-seo":
        result = await getCryptoSEOAgent().run(input);
        break;
      case "crypto-social":
        result = await getCryptoSocialAgent().run(input);
        break;
      case "crypto-email":
        result = await getCryptoEmailAgent().run(input);
        break;
      case "crypto-reviews":
        result = await getCryptoReviewsAgent().run(input);
        break;
      case "crypto-analytics":
        result = await getCryptoAnalyticsAgent().run(input);
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
