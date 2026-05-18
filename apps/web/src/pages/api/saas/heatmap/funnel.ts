import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getHeatmapService } from "../../../../../../../backend/saas/HeatmapService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { siteId?: string; steps?: string[] } | undefined;
    const siteId = typeof body?.siteId === "string" ? body.siteId.trim() : "";
    const steps = Array.isArray(body?.steps) ? body.steps.map((s) => String(s ?? "").trim()).filter(Boolean) : [];
    if (!siteId) return res.status(400).json({ error: "siteId requerido" });

    const analysis = await getHeatmapService().getFunnelAnalysis(siteId, user.userId, steps);
    return res.status(200).json({ analysis });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("no autorizado")) return res.status(403).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
