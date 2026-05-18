import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getHeatmapService } from "../../../../../../../backend/saas/HeatmapService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const svc = getHeatmapService();

    if (req.method === "GET") {
      const config = await svc.getSiteConfig(user.userId);
      return res.status(200).json({ config });
    }

    if (req.method === "POST") {
      const body = req.body as { domain?: string } | undefined;
      const domain = typeof body?.domain === "string" ? body.domain.trim() : "";
      if (!domain) return res.status(400).json({ error: "domain requerido" });
      const config = await svc.createSite(user.userId, domain);
      return res.status(201).json({ config });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
