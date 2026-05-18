import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasAnalyticsService } from "../../../../../../../backend/saas/SaasAnalyticsService";

function readOne(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const rawPeriod = readOne(req.query.period);
    const period = rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "30d";
    const analytics = await saasAnalyticsService.getClientAnalytics(user.userId, user.tenantId, period);

    return res.status(200).json({ analytics });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
