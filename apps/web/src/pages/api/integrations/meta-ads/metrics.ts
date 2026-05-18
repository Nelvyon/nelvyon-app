import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getMetaAdsService } from "../../../../../../../backend/integrations/MetaAdsService";

function readOne(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const campaignId = readOne(req.query.campaignId);
    const since = readOne(req.query.since);
    const until = readOne(req.query.until);
    if (!campaignId || !since || !until) {
      return res.status(400).json({ error: "campaignId, since y until son requeridos (YYYY-MM-DD)" });
    }

    const metrics = await getMetaAdsService().getCampaignMetrics(user.userId, campaignId, { since, until });
    return res.status(200).json({ metrics });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "meta_ads_validation") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "meta_ads_auth") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
