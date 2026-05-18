import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { ProspectInput } from "../../../../../../../backend/saas/ColdEmailService";
import { getColdEmailService } from "../../../../../../../backend/saas/ColdEmailService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { campaignId?: string } & Partial<ProspectInput>;
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!campaignId || !name || !email) {
      return res.status(400).json({ error: "campaignId, name y email son requeridos" });
    }

    const prospectIn: ProspectInput = {
      name,
      email,
      company: typeof body.company === "string" ? body.company.trim() || undefined : undefined,
      role: typeof body.role === "string" ? body.role.trim() || undefined : undefined,
    };

    const svc = getColdEmailService();
    const campaign = await svc.getCampaignById(campaignId, user.userId);
    if (!campaign) return res.status(404).json({ error: "Campaña no encontrada" });

    const prospect = await svc.addProspect(campaignId, user.userId, prospectIn);
    return res.status(201).json({ prospect });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
