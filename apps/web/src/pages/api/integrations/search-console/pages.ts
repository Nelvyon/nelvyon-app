import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getSearchConsoleService } from "../../../../../../../backend/integrations/GoogleSearchConsoleService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const limRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = limRaw ? Number.parseInt(limRaw, 10) : 10;
    if (Number.isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: "limit debe ser un número ≥ 1" });
    }

    const pages = await getSearchConsoleService().getTopPages(user.userId, limit);
    return res.status(200).json({ pages });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "search_console_auth") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "search_console_api") return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
