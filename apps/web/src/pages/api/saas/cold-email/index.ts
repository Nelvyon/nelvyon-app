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

    const svc = getColdEmailService();
    const campaigns = await svc.getCampaigns(user.userId);

    const campaignsWithStats = await Promise.all(
      campaigns.map(async (c) => {
        try {
          const stats = await svc.getStats(c.id, user.userId);
          return { ...c, stats };
        } catch {
          return { ...c, stats: null };
        }
      }),
    );

    return res.status(200).json({ campaigns: campaignsWithStats });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
