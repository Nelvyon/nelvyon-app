import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getLinkedInAdsService } from "../../../../../../../backend/integrations/LinkedInAdsService";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId.trim() : "";
    const start = typeof req.query.start === "string" ? req.query.start : "";
    const end = typeof req.query.end === "string" ? req.query.end : "";
    if (!campaignId) return res.status(400).json({ error: "campaignId es requerido" });
    if (!YMD.test(start) || !YMD.test(end)) {
      return res.status(400).json({ error: "start y end son requeridos (YYYY-MM-DD)" });
    }

    const metrics = await getLinkedInAdsService().getCampaignMetrics(user.userId, campaignId, { start, end });
    return res.status(200).json({ metrics });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "linkedin_auth") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "linkedin_api") return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
