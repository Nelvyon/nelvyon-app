import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { LegalInput, LegalMarketingInput } from "../../../../../../../backend/os-agents/sectors/legal";
import {
  getLegalActualizacionAgent,
  getLegalAdsAgent,
  getLegalClientEmailAgent,
  getLegalConsultationNurturingAgent,
  getLegalContentMarketingAgent,
  getLegalContratosAgent,
  getLegalFirmProfileAgent,
  getLegalGdprAgent,
  getLegalJurisdiccionAgent,
  getLegalNdaAgent,
  getLegalPrivacidadAgent,
  getLegalReferralAgent,
  getLegalReputationAgent,
  getLegalSEOAgent,
  getLegalSlaAgent,
  getLegalThoughtLeadershipAgent,
  getLegalTosAgent,
} from "../../../../../../../backend/os-agents/sectors/legal";

type MarketingAgentId =
  | "legal-firm-profile"
  | "legal-content-marketing"
  | "legal-seo"
  | "legal-ads"
  | "legal-client-email"
  | "legal-consultation-nurturing"
  | "legal-reputation"
  | "legal-referral"
  | "legal-thought-leadership";

type ComplianceAgentId = "legal-gdpr" | "legal-tos" | "legal-privacidad" | "legal-contratos" | "legal-nda" | "legal-sla" | "legal-jurisdiccion" | "legal-actualizacion";

type AgentId = MarketingAgentId | ComplianceAgentId;

const MARKETING_IDS: MarketingAgentId[] = [
  "legal-firm-profile",
  "legal-content-marketing",
  "legal-seo",
  "legal-ads",
  "legal-client-email",
  "legal-consultation-nurturing",
  "legal-reputation",
  "legal-referral",
  "legal-thought-leadership",
];

const COMPLIANCE_IDS: ComplianceAgentId[] = [
  "legal-gdpr",
  "legal-tos",
  "legal-privacidad",
  "legal-contratos",
  "legal-nda",
  "legal-sla",
  "legal-jurisdiccion",
  "legal-actualizacion",
];

const IDS: AgentId[] = [...MARKETING_IDS, ...COMPLIANCE_IDS];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceStringArray(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`${label} debe ser un array`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceLegalOsInput(userId: string, raw: unknown): LegalInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const businessName = typeof raw.businessName === "string" ? raw.businessName.trim() : "";
  const services = coerceStringArray(raw.services ?? [], "services");
  const targets = coerceStringArray(raw.targets ?? [], "targets");
  if (!businessName) throw new Error("businessName es obligatorio");

  return { userId, businessName, services, targets };
}

function defaultMarketingInput(): LegalMarketingInput {
  return { firmName: "", practiceArea: "otro", targetClient: "", tone: "profesional", location: "" };
}

async function saveResult(userId: string, agentId: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO legal_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input ?? {}), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { agentId?: string; input?: unknown } | undefined;
    const agentId = typeof body?.agentId === "string" ? body.agentId : "";
    if (!IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });

    let result: unknown;

    if (COMPLIANCE_IDS.includes(agentId as ComplianceAgentId)) {
      const input = coerceLegalOsInput(user.userId, body?.input ?? {});
      switch (agentId as ComplianceAgentId) {
        case "legal-gdpr":
          result = await getLegalGdprAgent().run(input);
          break;
        case "legal-tos":
          result = await getLegalTosAgent().run(input);
          break;
        case "legal-privacidad":
          result = await getLegalPrivacidadAgent().run(input);
          break;
        case "legal-contratos":
          result = await getLegalContratosAgent().run(input);
          break;
        case "legal-nda":
          result = await getLegalNdaAgent().run(input);
          break;
        case "legal-sla":
          result = await getLegalSlaAgent().run(input);
          break;
        case "legal-jurisdiccion":
          result = await getLegalJurisdiccionAgent().run(input);
          break;
        case "legal-actualizacion":
          result = await getLegalActualizacionAgent().run(input);
          break;
        default:
          return void res.status(400).json({ error: "agentId inválido" });
      }
      await saveResult(user.userId, agentId, input, result);
      return void res.status(200).json({ success: true, result });
    }

    const input = (body?.input as LegalMarketingInput | undefined) ?? defaultMarketingInput();
    switch (agentId as MarketingAgentId) {
      case "legal-firm-profile":
        result = await getLegalFirmProfileAgent().run(user.userId, input);
        break;
      case "legal-content-marketing":
        result = await getLegalContentMarketingAgent().run(user.userId, input);
        break;
      case "legal-seo":
        result = await getLegalSEOAgent().run(user.userId, input);
        break;
      case "legal-ads":
        result = await getLegalAdsAgent().run(user.userId, input);
        break;
      case "legal-client-email":
        result = await getLegalClientEmailAgent().run(user.userId, input);
        break;
      case "legal-consultation-nurturing":
        result = await getLegalConsultationNurturingAgent().run(user.userId, input);
        break;
      case "legal-reputation":
        result = await getLegalReputationAgent().run(user.userId, input);
        break;
      case "legal-referral":
        result = await getLegalReferralAgent().run(user.userId, input);
        break;
      case "legal-thought-leadership":
        result = await getLegalThoughtLeadershipAgent().run(user.userId, input);
        break;
      default:
        return void res.status(400).json({ error: "agentId inválido" });
    }
    await saveResult(user.userId, agentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    if (error instanceof Error && !error.message.includes("OPENAI_API_KEY")) {
      const isClientErr =
        error.message.includes("inválido") ||
        error.message.includes("obligatorio") ||
        error.message.includes("debe ser") ||
        error.message.includes("JSON inválido");
      if (isClientErr) return void res.status(400).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
