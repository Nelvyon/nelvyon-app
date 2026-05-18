import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { SessionFilters } from "../../../../../../../backend/saas/HeatmapService";
import { getHeatmapService } from "../../../../../../../backend/saas/HeatmapService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const siteId = typeof req.query.siteId === "string" ? req.query.siteId.trim() : "";
    if (!siteId) return res.status(400).json({ error: "siteId requerido" });

    const filters: SessionFilters = {};
    const device = typeof req.query.device === "string" ? req.query.device.trim() : "";
    if (device) filters.device = device;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate.trim() : "";
    if (fromDate) filters.fromDate = fromDate;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate.trim() : "";
    if (toDate) filters.toDate = toDate;

    const sessions = await getHeatmapService().getSessions(siteId, user.userId, filters);
    return res.status(200).json({ sessions });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("no autorizado")) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
