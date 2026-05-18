import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getSemrushService } from "../../../../../../../backend/integrations/SemrushService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const domain = typeof req.query.domain === "string" ? req.query.domain.trim() : "";
    const database = typeof req.query.database === "string" ? req.query.database.trim() : undefined;
    const limRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = limRaw ? Number.parseInt(limRaw, 10) : 10;
    if (!domain) return res.status(400).json({ error: "domain es requerido" });
    if (Number.isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: "limit debe ser un número ≥ 1" });
    }

    const keywords = await getSemrushService().getTopKeywords(user.userId, domain, limit, database);
    return res.status(200).json({ keywords });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "semrush_auth") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "semrush_api") return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
