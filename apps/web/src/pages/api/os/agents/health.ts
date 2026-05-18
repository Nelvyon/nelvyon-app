import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { HealthInput } from "../../../../../../../backend/os-agents/sectors/health";
import {
  getHealthAdsAgent,
  getHealthAppointmentNurturingAgent,
  getHealthClinicProfileAgent,
  getHealthContentMarketingAgent,
  getHealthCrisisCommsAgent,
  getHealthPatientEmailAgent,
  getHealthPatientRetentionAgent,
  getHealthReferralAgent,
  getHealthReviewStrategyAgent,
  getHealthSEOLocalAgent,
} from "../../../../../../../backend/os-agents/sectors/health";

type AgentId =
  | "health-clinic-profile"
  | "health-patient-email"
  | "health-content-marketing"
  | "health-seo-local"
  | "health-ads"
  | "health-review-strategy"
  | "health-referral"
  | "health-crisis-comms"
  | "health-appointment-nurturing"
  | "health-patient-retention";

const IDS: AgentId[] = [
  "health-clinic-profile",
  "health-patient-email",
  "health-content-marketing",
  "health-seo-local",
  "health-ads",
  "health-review-strategy",
  "health-referral",
  "health-crisis-comms",
  "health-appointment-nurturing",
  "health-patient-retention",
];

async function saveResult(userId: string, agentId: AgentId, input: HealthInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO health_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: HealthInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { clinicName: "", specialty: "otro", targetPatient: "", tone: "profesional", location: "" };
    let result;
    switch (agentId as AgentId) {
      case "health-clinic-profile": result = await getHealthClinicProfileAgent().run(user.userId, input); break;
      case "health-patient-email": result = await getHealthPatientEmailAgent().run(user.userId, input); break;
      case "health-content-marketing": result = await getHealthContentMarketingAgent().run(user.userId, input); break;
      case "health-seo-local": result = await getHealthSEOLocalAgent().run(user.userId, input); break;
      case "health-ads": result = await getHealthAdsAgent().run(user.userId, input); break;
      case "health-review-strategy": result = await getHealthReviewStrategyAgent().run(user.userId, input); break;
      case "health-referral": result = await getHealthReferralAgent().run(user.userId, input); break;
      case "health-crisis-comms": result = await getHealthCrisisCommsAgent().run(user.userId, input); break;
      case "health-appointment-nurturing": result = await getHealthAppointmentNurturingAgent().run(user.userId, input); break;
      case "health-patient-retention": result = await getHealthPatientRetentionAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}

