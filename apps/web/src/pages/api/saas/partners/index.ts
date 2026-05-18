import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasPartnersService } from "../../../../../../../backend/saas/SaasPartnersService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const partner = await saasPartnersService.getPartner(user.userId);
      return res.status(200).json({ partner });
    }

    if (req.method === "POST") {
      const partner = await saasPartnersService.registerPartner(user.userId, user.tenantId);
      return res.status(200).json({ partner });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    if (e instanceof Error && e.message.includes("Ya eres partner")) {
      return res.status(409).json({ error: e.message });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
