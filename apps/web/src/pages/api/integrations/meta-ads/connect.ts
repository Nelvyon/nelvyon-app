import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getMetaAdsService } from "../../../../../../../backend/integrations/MetaAdsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const adAccountId = typeof req.body?.adAccountId === "string" ? req.body.adAccountId.trim() : "";
    const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken : "";
    const pixelId = typeof req.body?.pixelId === "string" ? req.body.pixelId.trim() : "";
    if (!adAccountId || !accessToken || !pixelId) {
      return res.status(400).json({ error: "adAccountId, accessToken y pixelId son requeridos" });
    }

    await getMetaAdsService().saveCredentials(user.userId, adAccountId, accessToken, pixelId);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
