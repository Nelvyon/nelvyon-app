import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ComplianceInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getComplianceControlMapperAgent,
  getComplianceEvidenceCheckerAgent,
  getComplianceGapAnalyzerAgent,
  getComplianceIncidentPlanAgent,
  getCompliancePolicyDrafterAgent,
  getComplianceReadinessReportAgent,
  getComplianceRiskRegisterAgent,
  getComplianceVendorAssessorAgent,
} from "../../../../../../../backend/os-agents/sectors/compliance";

type ComplianceLibraryAgentId =
  | "compliance-gap-analyzer"
  | "compliance-control-mapper"
  | "compliance-policy-drafter"
  | "compliance-risk-register"
  | "compliance-evidence-checker"
  | "compliance-vendor-assessor"
  | "compliance-incident-plan"
  | "compliance-readiness-report";

const IDS: ComplianceLibraryAgentId[] = [
  "compliance-gap-analyzer",
  "compliance-control-mapper",
  "compliance-policy-drafter",
  "compliance-risk-register",
  "compliance-evidence-checker",
  "compliance-vendor-assessor",
  "compliance-incident-plan",
  "compliance-readiness-report",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceOptionalStringArray(raw: unknown, field: string): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new Error(`${field} debe ser un array de texto`);
  return raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
}

function coerceComplianceInput(userId: string, raw: unknown): ComplianceInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const framework = typeof raw.framework === "string" ? raw.framework.trim() : "";
  const region = typeof raw.region === "string" ? raw.region.trim() : undefined;
  if (!sector || !framework) throw new Error("sector y framework son obligatorios");

  const currentControls = coerceOptionalStringArray(raw.currentControls, "currentControls");
  const dataTypes = coerceOptionalStringArray(raw.dataTypes, "dataTypes");

  return {
    userId,
    sector,
    framework,
    currentControls,
    dataTypes,
    region: region || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO compliance_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ComplianceLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceComplianceInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ComplianceLibraryAgentId) {
      case "compliance-gap-analyzer":
        result = await getComplianceGapAnalyzerAgent().run(input);
        break;
      case "compliance-control-mapper":
        result = await getComplianceControlMapperAgent().run(input);
        break;
      case "compliance-policy-drafter":
        result = await getCompliancePolicyDrafterAgent().run(input);
        break;
      case "compliance-risk-register":
        result = await getComplianceRiskRegisterAgent().run(input);
        break;
      case "compliance-evidence-checker":
        result = await getComplianceEvidenceCheckerAgent().run(input);
        break;
      case "compliance-vendor-assessor":
        result = await getComplianceVendorAssessorAgent().run(input);
        break;
      case "compliance-incident-plan":
        result = await getComplianceIncidentPlanAgent().run(input);
        break;
      case "compliance-readiness-report":
        result = await getComplianceReadinessReportAgent().run(input);
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
