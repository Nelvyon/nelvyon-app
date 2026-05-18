import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getLinkedInAdsService } from "../../../../../../../backend/integrations/LinkedInAdsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const adAccountId =
      typeof req.body?.adAccountId === "string"
        ? req.body.adAccountId.trim().replace(/^urn:li:sponsoredAccount:/, "")
        : "";
    const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken : "";
    const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
    const expiryRaw = typeof req.body?.tokenExpiry === "string" ? req.body.tokenExpiry : "";
    if (!adAccountId || !accessToken.trim() || !refreshToken.trim() || !expiryRaw) {
      return res.status(400).json({ error: "adAccountId, accessToken, refreshToken y tokenExpiry son requeridos" });
    }
    const tokenExpiry = new Date(expiryRaw);
    if (Number.isNaN(tokenExpiry.getTime())) {
      return res.status(400).json({ error: "tokenExpiry inválido" });
    }

    await getLinkedInAdsService().saveCredentials(user.userId, adAccountId, accessToken, refreshToken, tokenExpiry);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "linkedin_validation") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
