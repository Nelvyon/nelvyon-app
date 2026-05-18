import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { BrandingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getBrandingArquitecturaAgent,
  getBrandingAuditAgent,
  getBrandingGuiaAgent,
  getBrandingIdentidadAgent,
  getBrandingLogoAgent,
  getBrandingNamingAgent,
  getBrandingPosicionamientoAgent,
  getBrandingVoiceAgent,
} from "../../../../../../../backend/os-agents/sectors/branding";

type BrandingAgentId =
  | "branding-identidad"
  | "branding-logo"
  | "branding-guia"
  | "branding-naming"
  | "branding-posicionamiento"
  | "branding-arquitectura"
  | "branding-voice"
  | "branding-audit";

const IDS: BrandingAgentId[] = [
  "branding-identidad",
  "branding-logo",
  "branding-guia",
  "branding-naming",
  "branding-posicionamiento",
  "branding-arquitectura",
  "branding-voice",
  "branding-audit",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceBrandingInput(userId: string, raw: unknown): BrandingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  let metadata: BrandingInput["metadata"];
  if (raw.metadata != null && isRecord(raw.metadata)) {
    const program = raw.metadata.program;
    if (typeof program === "string" && program.trim()) {
      metadata = { program: program.trim() };
    }
  }

  return { userId, businessName, services, targets, metadata };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO branding_results (user_id, agent_id, input, output)
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
    if (!IDS.includes(agentId as BrandingAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceBrandingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as BrandingAgentId) {
      case "branding-identidad":
        result = await getBrandingIdentidadAgent().run(input);
        break;
      case "branding-logo":
        result = await getBrandingLogoAgent().run(input);
        break;
      case "branding-guia":
        result = await getBrandingGuiaAgent().run(input);
        break;
      case "branding-naming":
        result = await getBrandingNamingAgent().run(input);
        break;
      case "branding-posicionamiento":
        result = await getBrandingPosicionamientoAgent().run(input);
        break;
      case "branding-arquitectura":
        result = await getBrandingArquitecturaAgent().run(input);
        break;
      case "branding-voice":
        result = await getBrandingVoiceAgent().run(input);
        break;
      case "branding-audit":
        result = await getBrandingAuditAgent().run(input);
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
        e.message.includes("debe ser") ||
        e.message.includes("JSON inválido");
      if (isClientErr) return res.status(400).json({ error: e.message });
    }
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
