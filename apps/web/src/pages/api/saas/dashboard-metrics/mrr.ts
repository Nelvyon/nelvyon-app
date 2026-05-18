import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getDashboardMetricsService } from "../../../../../../../backend/saas/DashboardMetricsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const monthsRaw = typeof req.query.months === "string" ? Number.parseInt(req.query.months, 10) : 6;
    const months = Number.isFinite(monthsRaw) ? monthsRaw : 6;
    const data = await getDashboardMetricsService().getMRRMetrics(user.userId, months);
    return res.status(200).json({ data });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
