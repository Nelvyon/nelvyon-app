import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { VetInput } from "../../../../../../../backend/os-agents/sectors/veterinary";
import {
  getVetAppointmentNurturingAgent,
  getVetClinicProfileAgent,
  getVetContentMarketingAgent,
  getVetLocalSEOAgent,
  getVetLoyaltyProgramAgent,
  getVetPetShopContentAgent,
  getVetReviewSystemAgent,
  getVetSeasonalCampaignAgent,
} from "../../../../../../../backend/os-agents/sectors/veterinary";

type AgentId =
  | "vet-clinic-profile"
  | "vet-content-marketing"
  | "vet-local-seo"
  | "vet-appointment-nurturing"
  | "vet-seasonal-campaign"
  | "vet-review-system"
  | "vet-loyalty-program"
  | "vet-pet-shop-content";

const IDS: AgentId[] = [
  "vet-clinic-profile",
  "vet-content-marketing",
  "vet-local-seo",
  "vet-appointment-nurturing",
  "vet-seasonal-campaign",
  "vet-review-system",
  "vet-loyalty-program",
  "vet-pet-shop-content",
];

async function saveResult(userId: string, agentId: AgentId, input: VetInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO veterinary_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: VetInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { businessName: "", serviceType: "otro", targetPet: "todas", tone: "profesional" };
    let result;
    switch (agentId as AgentId) {
      case "vet-clinic-profile": result = await getVetClinicProfileAgent().run(user.userId, input); break;
      case "vet-content-marketing": result = await getVetContentMarketingAgent().run(user.userId, input); break;
      case "vet-local-seo": result = await getVetLocalSEOAgent().run(user.userId, input); break;
      case "vet-appointment-nurturing": result = await getVetAppointmentNurturingAgent().run(user.userId, input); break;
      case "vet-seasonal-campaign": result = await getVetSeasonalCampaignAgent().run(user.userId, input); break;
      case "vet-review-system": result = await getVetReviewSystemAgent().run(user.userId, input); break;
      case "vet-loyalty-program": result = await getVetLoyaltyProgramAgent().run(user.userId, input); break;
      case "vet-pet-shop-content": result = await getVetPetShopContentAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}
