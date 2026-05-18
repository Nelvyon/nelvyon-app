import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { ContactEnrichmentMasivoInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getContactEnrichmentMasivoCompanyAgent,
  getContactEnrichmentMasivoDedupeAgent,
  getContactEnrichmentMasivoEmailAgent,
  getContactEnrichmentMasivoICPAgent,
  getContactEnrichmentMasivoLinkedInAgent,
  getContactEnrichmentMasivoPhoneAgent,
  getContactEnrichmentMasivoReportAgent,
  getContactEnrichmentMasivoSocialAgent,
} from "../../../../../../../backend/os-agents/sectors/contactenrichmentmasivo";

type ContactEnrichmentMasivoLibraryAgentId =
  | "contactenrichmentmasivo-email"
  | "contactenrichmentmasivo-phone"
  | "contactenrichmentmasivo-linkedin"
  | "contactenrichmentmasivo-company"
  | "contactenrichmentmasivo-social"
  | "contactenrichmentmasivo-icp"
  | "contactenrichmentmasivo-dedupe"
  | "contactenrichmentmasivo-report";

const IDS: ContactEnrichmentMasivoLibraryAgentId[] = [
  "contactenrichmentmasivo-email",
  "contactenrichmentmasivo-phone",
  "contactenrichmentmasivo-linkedin",
  "contactenrichmentmasivo-company",
  "contactenrichmentmasivo-social",
  "contactenrichmentmasivo-icp",
  "contactenrichmentmasivo-dedupe",
  "contactenrichmentmasivo-report",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceMetadata(raw: unknown): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new Error("metadata debe ser un objeto");
  return raw as Record<string, unknown>;
}

function coerceContactEnrichmentMasivoInput(userId: string, raw: unknown): ContactEnrichmentMasivoInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const brand = typeof raw.brand === "string" ? raw.brand.trim() : "";
  const contactBrief = typeof raw.contactBrief === "string" ? raw.contactBrief.trim() : undefined;
  const metricsBrief = typeof raw.metricsBrief === "string" ? raw.metricsBrief.trim() : undefined;
  const metadata = coerceMetadata(raw.metadata);
  if (!sector || !brand) throw new Error("sector y brand son obligatorios");

  return {
    userId,
    sector,
    brand,
    contactBrief: contactBrief || undefined,
    metricsBrief: metricsBrief || undefined,
    metadata,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO contactenrichmentmasivo_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as ContactEnrichmentMasivoLibraryAgentId)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const input = coerceContactEnrichmentMasivoInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as ContactEnrichmentMasivoLibraryAgentId) {
      case "contactenrichmentmasivo-email":
        result = await getContactEnrichmentMasivoEmailAgent().run(input);
        break;
      case "contactenrichmentmasivo-phone":
        result = await getContactEnrichmentMasivoPhoneAgent().run(input);
        break;
      case "contactenrichmentmasivo-linkedin":
        result = await getContactEnrichmentMasivoLinkedInAgent().run(input);
        break;
      case "contactenrichmentmasivo-company":
        result = await getContactEnrichmentMasivoCompanyAgent().run(input);
        break;
      case "contactenrichmentmasivo-social":
        result = await getContactEnrichmentMasivoSocialAgent().run(input);
        break;
      case "contactenrichmentmasivo-icp":
        result = await getContactEnrichmentMasivoICPAgent().run(input);
        break;
      case "contactenrichmentmasivo-dedupe":
        result = await getContactEnrichmentMasivoDedupeAgent().run(input);
        break;
      case "contactenrichmentmasivo-report":
        result = await getContactEnrichmentMasivoReportAgent().run(input);
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
