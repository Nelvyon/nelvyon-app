import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { osReportingService } from "../../../../../../../backend/os-agents/OsReportingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const periodStartRaw = typeof req.body?.periodStart === "string" ? req.body.periodStart : undefined;
    const periodEndRaw = typeof req.body?.periodEnd === "string" ? req.body.periodEnd : undefined;
    if (!periodStartRaw || !periodEndRaw) {
      return res.status(400).json({ error: "periodStart y periodEnd son requeridos" });
    }

    const periodStart = new Date(periodStartRaw);
    const periodEnd = new Date(periodEndRaw);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      return res.status(400).json({ error: "Fechas inválidas" });
    }
    if (periodEnd < periodStart) {
      return res.status(400).json({ error: "periodEnd no puede ser menor a periodStart" });
    }

    const report = await osReportingService.generateMonthlyReport(user.userId, periodStart, periodEnd);
    return res.status(201).json({ report });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
