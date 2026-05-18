import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { AttributionService } from "../../../../../../../backend/os-agents/attribution/AttributionService";
import type { AttributionModel } from "../../../../../../../backend/os-agents/attribution/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
    const periodStart = typeof body.periodStart === "string" ? body.periodStart : null;
    const periodEnd = typeof body.periodEnd === "string" ? body.periodEnd : null;
    if (body.action === "compare") {
      const reports = await AttributionService.compareModels(user.userId, periodStart, periodEnd);
      return res.status(200).json({ reports });
    }
    const model = typeof body.model === "string" ? body.model : "";
    if (!model) return res.status(400).json({ error: "model requerido" });
    const report = await AttributionService.runModel(user.userId, model as AttributionModel, periodStart, periodEnd);
    return res.status(200).json({ report });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("inválido") || msg.includes("requerido")) return res.status(400).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
