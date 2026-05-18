import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { ABMetric } from "../../../../../../../backend/saas/ABTestingService";
import { getABTestingService } from "../../../../../../../backend/saas/ABTestingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const name = typeof req.body?.name === "string" ? req.body.name : "";
    const metric = typeof req.body?.metric === "string" ? req.body.metric : "conversions";
    const duration_days = Number(req.body?.duration_days ?? 7);
    const variants = Array.isArray(req.body?.variants) ? req.body.variants : [];
    const test = await getABTestingService().createTest(user.userId, { name, metric: metric as ABMetric, duration_days, variants });
    return res.status(201).json({ test });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
