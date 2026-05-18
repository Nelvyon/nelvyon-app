import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { DatabaseImportInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getDatabaseImportCleanerAgent,
  getDatabaseImportEnricherAgent,
  getDatabaseImportMappingAgent,
  getDatabaseImportParserAgent,
  getDatabaseImportReportAgent,
  getDatabaseImportScoringAgent,
  getDatabaseImportSegmentAgent,
  getDatabaseImportValidatorAgent,
} from "../../../../../../../backend/os-agents/sectors/databaseimport";

type DatabaseImportLibraryAgentId =
  | "databaseimport-parser"
  | "databaseimport-validator"
  | "databaseimport-cleaner"
  | "databaseimport-segment"
  | "databaseimport-enricher"
  | "databaseimport-scoring"
  | "databaseimport-mapping"
  | "databaseimport-report";

const IDS: DatabaseImportLibraryAgentId[] = [
  "databaseimport-parser",
  "databaseimport-validator",
  "databaseimport-cleaner",
  "databaseimport-segment",
  "databaseimport-enricher",
  "databaseimport-scoring",
  "databaseimport-mapping",
  "databaseimport-report",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceDatabaseImportInput(userId: string, raw: unknown): DatabaseImportInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const importBrief = typeof raw.importBrief === "string" ? raw.importBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    importBrief: importBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO databaseimport_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as DatabaseImportLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceDatabaseImportInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as DatabaseImportLibraryAgentId) {
      case "databaseimport-parser":
        result = await getDatabaseImportParserAgent().run(input);
        break;
      case "databaseimport-validator":
        result = await getDatabaseImportValidatorAgent().run(input);
        break;
      case "databaseimport-cleaner":
        result = await getDatabaseImportCleanerAgent().run(input);
        break;
      case "databaseimport-segment":
        result = await getDatabaseImportSegmentAgent().run(input);
        break;
      case "databaseimport-enricher":
        result = await getDatabaseImportEnricherAgent().run(input);
        break;
      case "databaseimport-scoring":
        result = await getDatabaseImportScoringAgent().run(input);
        break;
      case "databaseimport-mapping":
        result = await getDatabaseImportMappingAgent().run(input);
        break;
      case "databaseimport-report":
        result = await getDatabaseImportReportAgent().run(input);
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
