import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { osReportingService } from "../../../../../../../backend/os-agents/OsReportingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const id = typeof req.query.id === "string" ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : undefined;
    if (!id) return res.status(400).json({ error: "Id requerido" });

    const report = await osReportingService.getReport(id, user.userId);
    if (!report) return res.status(404).json({ error: "Reporte no encontrado" });

    return res.status(200).json({ report });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
