import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getColdEmailService } from "../../../../../../../backend/saas/ColdEmailService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { campaignId?: string } | undefined;
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId.trim() : "";
    if (!campaignId) return res.status(400).json({ error: "campaignId requerido" });

    try {
      const campaign = await getColdEmailService().launchCampaign(campaignId, user.userId);
      return res.status(200).json({ campaign });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("no encontrada")) return res.status(404).json({ error: msg });
      if (msg.includes("borrador")) return res.status(400).json({ error: msg });
      if (msg.includes("vacía")) return res.status(400).json({ error: msg });
      throw err;
    }
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
