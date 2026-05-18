import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { MfaInput, MfaMethod, MfaRiskLevel } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getMfaAnomalyDetectorAgent,
  getMfaComplianceCheckerAgent,
  getMfaIncidentResponseAgent,
  getMfaPolicyGeneratorAgent,
  getMfaRecoveryFlowAgent,
  getMfaRiskAssessorAgent,
  getMfaSetupGuideAgent,
  getMfaUserEducationAgent,
} from "../../../../../../../backend/os-agents/sectors/mfa";

type MfaLibraryAgentId =
  | "mfa-setup-guide"
  | "mfa-risk-assessor"
  | "mfa-recovery-flow"
  | "mfa-compliance-checker"
  | "mfa-user-education"
  | "mfa-anomaly-detector"
  | "mfa-policy-generator"
  | "mfa-incident-response";

const IDS: MfaLibraryAgentId[] = [
  "mfa-setup-guide",
  "mfa-risk-assessor",
  "mfa-recovery-flow",
  "mfa-compliance-checker",
  "mfa-user-education",
  "mfa-anomaly-detector",
  "mfa-policy-generator",
  "mfa-incident-response",
];

const MFA_METHODS: MfaMethod[] = ["totp", "sms", "email", "backup"];
const RISK_LEVELS: MfaRiskLevel[] = ["low", "medium", "high"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMfaInput(userId: string, raw: unknown): MfaInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const userEmail = typeof raw.userEmail === "string" ? raw.userEmail.trim() : "";
  const methodRaw = typeof raw.mfaMethod === "string" ? raw.mfaMethod.trim() : "";
  const riskRaw = typeof raw.riskLevel === "string" ? raw.riskLevel.trim() : "";
  if (!sector || !userEmail) throw new Error("sector y userEmail son obligatorios");

  let mfaMethod: MfaMethod | undefined;
  if (methodRaw) {
    if (!MFA_METHODS.includes(methodRaw as MfaMethod)) {
      throw new Error("mfaMethod debe ser totp, sms, email o backup");
    }
    mfaMethod = methodRaw as MfaMethod;
  }

  let riskLevel: MfaRiskLevel | undefined;
  if (riskRaw) {
    if (!RISK_LEVELS.includes(riskRaw as MfaRiskLevel)) {
      throw new Error("riskLevel debe ser low, medium o high");
    }
    riskLevel = riskRaw as MfaRiskLevel;
  }

  return {
    userId,
    sector,
    userEmail,
    mfaMethod,
    riskLevel,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO mfa_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as MfaLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceMfaInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as MfaLibraryAgentId) {
      case "mfa-setup-guide":
        result = await getMfaSetupGuideAgent().run(input);
        break;
      case "mfa-risk-assessor":
        result = await getMfaRiskAssessorAgent().run(input);
        break;
      case "mfa-recovery-flow":
        result = await getMfaRecoveryFlowAgent().run(input);
        break;
      case "mfa-compliance-checker":
        result = await getMfaComplianceCheckerAgent().run(input);
        break;
      case "mfa-user-education":
        result = await getMfaUserEducationAgent().run(input);
        break;
      case "mfa-anomaly-detector":
        result = await getMfaAnomalyDetectorAgent().run(input);
        break;
      case "mfa-policy-generator":
        result = await getMfaPolicyGeneratorAgent().run(input);
        break;
      case "mfa-incident-response":
        result = await getMfaIncidentResponseAgent().run(input);
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
