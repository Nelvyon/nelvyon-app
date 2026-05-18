import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getTikTokAdsService } from "../../../../../../../backend/integrations/TikTokAdsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const advertiserId =
      typeof req.body?.advertiserId === "string" ? req.body.advertiserId.trim() : "";
    const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken : "";
    if (!advertiserId || !accessToken.trim()) {
      return res.status(400).json({ error: "advertiserId y accessToken son requeridos" });
    }

    await getTikTokAdsService().saveCredentials(user.userId, advertiserId, accessToken);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "tiktok_validation") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
