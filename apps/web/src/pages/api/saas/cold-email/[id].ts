import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getColdEmailService } from "../../../../../../../backend/saas/ColdEmailService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "id requerido" });

    const svc = getColdEmailService();
    const campaign = await svc.getCampaignById(id, user.userId);
    if (!campaign) return res.status(404).json({ error: "No encontrado" });

    const prospects = await svc.getProspectsForCampaign(id, user.userId);
    const stats = await svc.getStats(id, user.userId);

    return res.status(200).json({ campaign, prospects, stats });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
