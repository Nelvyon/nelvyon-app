import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getShopifyService } from "../../../../../../../backend/integrations/ShopifyService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const shopDomain = typeof req.body?.shopDomain === "string" ? req.body.shopDomain.trim() : "";
    const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken.trim() : "";
    if (!shopDomain || !accessToken) {
      return res.status(400).json({ error: "shopDomain y accessToken son requeridos" });
    }

    await getShopifyService().saveCredentials(user.userId, shopDomain, accessToken);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "shopify_validation") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
