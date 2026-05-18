import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";
import type { OnboardingInput } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import {
  getOnboardingChecklistBuilderAgent,
  getOnboardingDropoffRecoveryAgent,
  getGuidedOnboardingEmailSequenceAgent,
  getOnboardingProgressNudgeAgent,
  getOnboardingSuccessMilestoneAgent,
  getOnboardingTooltipCopyAgent,
  getOnboardingVideoScriptAgent,
  getOnboardingWelcomeFlowAgent,
} from "../../../../../../../backend/os-agents/sectors/onboarding";

type OnboardingLibraryAgentId =
  | "onboarding-welcome-flow"
  | "onboarding-checklist-builder"
  | "onboarding-tooltip-copy"
  | "onboarding-progress-nudge"
  | "onboarding-video-script"
  | "onboarding-email-sequence"
  | "onboarding-dropoff-recovery"
  | "onboarding-success-milestone";

const IDS: OnboardingLibraryAgentId[] = [
  "onboarding-welcome-flow",
  "onboarding-checklist-builder",
  "onboarding-tooltip-copy",
  "onboarding-progress-nudge",
  "onboarding-video-script",
  "onboarding-email-sequence",
  "onboarding-dropoff-recovery",
  "onboarding-success-milestone",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceCompletedSteps(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
  return out.length ? out : undefined;
}

function coerceOnboardingInput(userId: string, raw: unknown): OnboardingInput {
  if (!isRecord(raw)) throw new Error("input inválido");
  const sector = typeof raw.sector === "string" ? raw.sector.trim() : "";
  const productName = typeof raw.productName === "string" ? raw.productName.trim() : "";
  if (!sector || !productName) {
    throw new Error("sector y productName son obligatorios");
  }
  const userRole = typeof raw.userRole === "string" ? raw.userRole.trim() : undefined;
  const planType = typeof raw.planType === "string" ? raw.planType.trim() : undefined;
  const completedSteps = coerceCompletedSteps(raw.completedSteps);
  return {
    userId,
    sector,
    productName,
    userRole: userRole || undefined,
    planType: planType || undefined,
    completedSteps,
  };
}

async function saveResult(userId: string, agentId: string, sector: string, input: unknown, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    `INSERT INTO onboarding_results (user_id, agent_id, sector, input, output)
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
    if (!IDS.includes(agentId as OnboardingLibraryAgentId)) return res.status(400).json({ error: "agentId inválido" });

    const input = coerceOnboardingInput(user.userId, body?.input ?? {});

    let result;
    switch (agentId as OnboardingLibraryAgentId) {
      case "onboarding-welcome-flow":
        result = await getOnboardingWelcomeFlowAgent().run(input);
        break;
      case "onboarding-checklist-builder":
        result = await getOnboardingChecklistBuilderAgent().run(input);
        break;
      case "onboarding-tooltip-copy":
        result = await getOnboardingTooltipCopyAgent().run(input);
        break;
      case "onboarding-progress-nudge":
        result = await getOnboardingProgressNudgeAgent().run(input);
        break;
      case "onboarding-video-script":
        result = await getOnboardingVideoScriptAgent().run(input);
        break;
      case "onboarding-email-sequence":
        result = await getGuidedOnboardingEmailSequenceAgent().run(input);
        break;
      case "onboarding-dropoff-recovery":
        result = await getOnboardingDropoffRecoveryAgent().run(input);
        break;
      case "onboarding-success-milestone":
        result = await getOnboardingSuccessMilestoneAgent().run(input);
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
