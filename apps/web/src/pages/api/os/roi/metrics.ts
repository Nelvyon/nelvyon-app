import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getClosedLoopRoiService } from "../../../../../../../backend/os-agents/ClosedLoopRoiService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const start = typeof req.query.start === "string" ? req.query.start : undefined;
    const end = typeof req.query.end === "string" ? req.query.end : undefined;
    const dateRange = start && end ? { start, end } : undefined;

    const metrics = await getClosedLoopRoiService().getRoiMetrics(user.userId, dateRange);
    return res.status(200).json({ metrics });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
