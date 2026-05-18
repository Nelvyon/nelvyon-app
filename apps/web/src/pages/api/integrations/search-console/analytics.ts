import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getSearchConsoleService } from "../../../../../../../backend/integrations/GoogleSearchConsoleService";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : "";
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : "";
    if (!YMD.test(startDate) || !YMD.test(endDate)) {
      return res.status(400).json({ error: "startDate y endDate son requeridos (YYYY-MM-DD)" });
    }

    const dimRaw = typeof req.query.dimensions === "string" ? req.query.dimensions : "";
    let dimensions: string[] = ["query", "page"];
    if (dimRaw.trim()) {
      dimensions = dimRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const rows = await getSearchConsoleService().getSearchAnalytics(user.userId, { startDate, endDate }, dimensions);
    return res.status(200).json({ rows });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "search_console_auth") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "search_console_api") return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
