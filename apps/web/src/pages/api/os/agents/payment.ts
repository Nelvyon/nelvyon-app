import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { PaymentInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getPaymentDunningSequenceAgent,
  getPaymentEscalationAgent,
  getPaymentFirmNoticeAgent,
  getPaymentLegalNoticeAgent,
  getPaymentRecoveryOfferAgent,
  getPaymentRiskProfilerAgent,
  getPaymentSoftReminderAgent,
  getPaymentWinbackAgent,
} from "../../../../../../../backend/os-agents/sectors/payment";

type PaymentLibraryAgentId =
  | "payment-dunning-sequence"
  | "payment-soft-reminder"
  | "payment-firm-notice"
  | "payment-recovery-offer"
  | "payment-escalation"
  | "payment-winback"
  | "payment-risk-profiler"
  | "payment-legal-notice";

const IDS: PaymentLibraryAgentId[] = [
  "payment-dunning-sequence",
  "payment-soft-reminder",
  "payment-firm-notice",
  "payment-recovery-offer",
  "payment-escalation",
  "payment-winback",
  "payment-risk-profiler",
  "payment-legal-notice",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coercePaymentInput(userId: string, raw: unknown): PaymentInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const clientName = typeof raw.clientName === "string" ? raw.clientName.trim() : "";
  const amountDue = typeof raw.amountDue === "string" ? raw.amountDue.trim() : "";
  if (!sector || !clientName || !amountDue) {
    throw new Error("sector, clientName y amountDue son obligatorios");
  }
  let daysPastDue: number | undefined;
  if (typeof raw.daysPastDue === "number" && Number.isFinite(raw.daysPastDue)) {
    daysPastDue = raw.daysPastDue;
  } else if (typeof raw.daysPastDue === "string" && raw.daysPastDue.trim()) {
    const n = Number(raw.daysPastDue.trim());
    if (Number.isFinite(n)) daysPastDue = n;
  }
  let previousAttempts: number | undefined;
  if (typeof raw.previousAttempts === "number" && Number.isFinite(raw.previousAttempts)) {
    previousAttempts = raw.previousAttempts;
  } else if (typeof raw.previousAttempts === "string" && raw.previousAttempts.trim()) {
    const n = Number(raw.previousAttempts.trim());
    if (Number.isFinite(n)) previousAttempts = n;
  }
  const planType = typeof raw.planType === "string" ? raw.planType.trim() : undefined;
  return {
    userId,
    sector,
    clientName,
    amountDue,
    daysPastDue,
    previousAttempts,
    planType: planType || undefined,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO payment_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as PaymentLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coercePaymentInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as PaymentLibraryAgentId) {
      case "payment-dunning-sequence":
        result = await getPaymentDunningSequenceAgent().run(input);
        break;
      case "payment-soft-reminder":
        result = await getPaymentSoftReminderAgent().run(input);
        break;
      case "payment-firm-notice":
        result = await getPaymentFirmNoticeAgent().run(input);
        break;
      case "payment-recovery-offer":
        result = await getPaymentRecoveryOfferAgent().run(input);
        break;
      case "payment-escalation":
        result = await getPaymentEscalationAgent().run(input);
        break;
      case "payment-winback":
        result = await getPaymentWinbackAgent().run(input);
        break;
      case "payment-risk-profiler":
        result = await getPaymentRiskProfilerAgent().run(input);
        break;
      case "payment-legal-notice":
        result = await getPaymentLegalNoticeAgent().run(input);
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
