import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { DbClient } from "../../../../../../../backend/db/DbClient";
import type { EducationInput } from "../../../../../../../backend/os-agents/sectors/education";
import {
  getEducationAdsAgent,
  getEducationCommunityAgent,
  getEducationContentMarketingAgent,
  getEducationCourseDescriptionAgent,
  getEducationEmailNurturingAgent,
  getEducationPartnershipAgent,
  getEducationRetentionAgent,
  getEducationSalesPageAgent,
  getEducationSEOAgent,
  getEducationStudentTestimonialAgent,
  getEducationUpsellAgent,
  getEducationWebinarScriptAgent,
} from "../../../../../../../backend/os-agents/sectors/education";

type AgentId =
  | "education-course-description"
  | "education-sales-page"
  | "education-email-nurturing"
  | "education-content-marketing"
  | "education-webinar-script"
  | "education-student-testimonial"
  | "education-seo"
  | "education-ads"
  | "education-community"
  | "education-partnership"
  | "education-retention"
  | "education-upsell";

const IDS: AgentId[] = [
  "education-course-description",
  "education-sales-page",
  "education-email-nurturing",
  "education-content-marketing",
  "education-webinar-script",
  "education-student-testimonial",
  "education-seo",
  "education-ads",
  "education-community",
  "education-partnership",
  "education-retention",
  "education-upsell",
];

async function saveResult(userId: string, agentId: AgentId, input: EducationInput, output: unknown): Promise<void> {
  await DbClient.getInstance().query(
    "INSERT INTO education_results (user_id, agent_id, input, output) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)",
    [userId, agentId, JSON.stringify(input), JSON.stringify(output ?? {})],
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") return void res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return void res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = req.body as { agentId?: string; input?: EducationInput } | undefined;
    const agentId = body?.agentId;
    if (!agentId || !IDS.includes(agentId as AgentId)) return void res.status(400).json({ error: "agentId inválido" });
    const input = body?.input ?? { institutionName: "", educationType: "plataforma-elearning", targetStudent: "", subjectArea: "otro", tone: "profesional", format: "curso-grabado" };
    let result;
    switch (agentId as AgentId) {
      case "education-course-description": result = await getEducationCourseDescriptionAgent().run(user.userId, input); break;
      case "education-sales-page": result = await getEducationSalesPageAgent().run(user.userId, input); break;
      case "education-email-nurturing": result = await getEducationEmailNurturingAgent().run(user.userId, input); break;
      case "education-content-marketing": result = await getEducationContentMarketingAgent().run(user.userId, input); break;
      case "education-webinar-script": result = await getEducationWebinarScriptAgent().run(user.userId, input); break;
      case "education-student-testimonial": result = await getEducationStudentTestimonialAgent().run(user.userId, input); break;
      case "education-seo": result = await getEducationSEOAgent().run(user.userId, input); break;
      case "education-ads": result = await getEducationAdsAgent().run(user.userId, input); break;
      case "education-community": result = await getEducationCommunityAgent().run(user.userId, input); break;
      case "education-partnership": result = await getEducationPartnershipAgent().run(user.userId, input); break;
      case "education-retention": result = await getEducationRetentionAgent().run(user.userId, input); break;
      case "education-upsell": result = await getEducationUpsellAgent().run(user.userId, input); break;
    }
    await saveResult(user.userId, agentId as AgentId, input, result);
    return void res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    if (error instanceof OsAgentError && error.message === "Unauthorized") return void res.status(401).json({ error: "Token inválido" });
    const message = error instanceof Error ? error.message : "Error interno";
    return void res.status(500).json({ error: message });
  }
}

