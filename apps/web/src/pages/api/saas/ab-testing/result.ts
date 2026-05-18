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
    await getAuthService().verifyToken(token);
    const testId = typeof req.body?.testId === "string" ? req.body.testId : "";
    const variantId = typeof req.body?.variantId === "string" ? req.body.variantId : "";
    const metric = typeof req.body?.metric === "string" ? req.body.metric : "";
    const value = Number(req.body?.value ?? 0);
    if (!testId || !variantId || !metric) return res.status(400).json({ error: "testId, variantId y metric requeridos" });
    await getABTestingService().recordResult(testId, variantId, metric as ABMetric, value);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
