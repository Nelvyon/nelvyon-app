import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getTikTokAdsService } from "../../../../../../../backend/integrations/TikTokAdsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const campaigns = await getTikTokAdsService().getCampaigns(user.userId);
    return res.status(200).json({ campaigns });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "tiktok_auth") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "tiktok_api") return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
