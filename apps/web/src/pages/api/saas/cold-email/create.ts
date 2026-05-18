import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { CreateCampaignInput } from "../../../../../../../backend/saas/ColdEmailService";
import { getColdEmailService } from "../../../../../../../backend/saas/ColdEmailService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as Partial<CreateCampaignInput> | undefined;
    if (
      !body ||
      typeof body.targetCompany !== "string" ||
      typeof body.targetName !== "string" ||
      typeof body.targetRole !== "string" ||
      typeof body.targetIndustry !== "string" ||
      typeof body.ourService !== "string" ||
      typeof body.valueProposition !== "string" ||
      typeof body.senderName !== "string"
    ) {
      return res.status(400).json({ error: "Todos los campos de campaña son requeridos" });
    }

    const input: CreateCampaignInput = {
      targetCompany: body.targetCompany.trim(),
      targetName: body.targetName.trim(),
      targetRole: body.targetRole.trim(),
      targetIndustry: body.targetIndustry.trim(),
      ourService: body.ourService.trim(),
      valueProposition: body.valueProposition.trim(),
      senderName: body.senderName.trim(),
    };

    const campaign = await getColdEmailService().createCampaign(user.userId, input);
    return res.status(201).json({ campaign });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
