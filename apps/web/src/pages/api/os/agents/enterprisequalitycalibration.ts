import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { EnterpriseQualityCalibrationInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getEnterpriseQualityAuditAgent,
  getEnterpriseQualityBenchmarkAgent,
  getEnterpriseQualityCalibrationAgent,
  getEnterpriseQualityImprovementAgent,
  getEnterpriseQualityRejectorAgent,
  getEnterpriseQualityReportAgent,
  getEnterpriseQualityReviewerAgent,
  getEnterpriseQualityScoreAgent,
} from "../../../../../../../backend/os-agents/sectors/enterprisequalitycalibration";

type EnterpriseQualityCalibrationLibraryAgentId =
  | "enterprisequalitycalibration-score"
  | "enterprisequalitycalibration-benchmark"
  | "enterprisequalitycalibration-reviewer"
  | "enterprisequalitycalibration-rejector"
  | "enterprisequalitycalibration-calibration"
  | "enterprisequalitycalibration-audit"
  | "enterprisequalitycalibration-report"
  | "enterprisequalitycalibration-improvement";

const IDS: EnterpriseQualityCalibrationLibraryAgentId[] = [
  "enterprisequalitycalibration-score",
  "enterprisequalitycalibration-benchmark",
  "enterprisequalitycalibration-reviewer",
  "enterprisequalitycalibration-rejector",
  "enterprisequalitycalibration-calibration",
  "enterprisequalitycalibration-audit",
  "enterprisequalitycalibration-report",
  "enterprisequalitycalibration-improvement",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceEnterpriseQualityCalibrationInput(userId: string, raw: unknown): EnterpriseQualityCalibrationInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const calibrationBrief = typeof raw.calibrationBrief === "string" ? raw.calibrationBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    calibrationBrief: calibrationBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO enterprisequalitycalibration_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as EnterpriseQualityCalibrationLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceEnterpriseQualityCalibrationInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as EnterpriseQualityCalibrationLibraryAgentId) {
      case "enterprisequalitycalibration-score":
        result = await getEnterpriseQualityScoreAgent().run(input);
        break;
      case "enterprisequalitycalibration-benchmark":
        result = await getEnterpriseQualityBenchmarkAgent().run(input);
        break;
      case "enterprisequalitycalibration-reviewer":
        result = await getEnterpriseQualityReviewerAgent().run(input);
        break;
      case "enterprisequalitycalibration-rejector":
        result = await getEnterpriseQualityRejectorAgent().run(input);
        break;
      case "enterprisequalitycalibration-calibration":
        result = await getEnterpriseQualityCalibrationAgent().run(input);
        break;
      case "enterprisequalitycalibration-audit":
        result = await getEnterpriseQualityAuditAgent().run(input);
        break;
      case "enterprisequalitycalibration-report":
        result = await getEnterpriseQualityReportAgent().run(input);
        break;
      case "enterprisequalitycalibration-improvement":
        result = await getEnterpriseQualityImprovementAgent().run(input);
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
