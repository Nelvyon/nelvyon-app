import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { AbTestingService } from "../../../../../../../../../backend/os-agents/ab-testing/AbTestingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    void user;

    const experimentId = typeof req.query.id === "string" ? req.query.id : "";
    if (!experimentId) return res.status(400).json({ error: "id requerido" });

    const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
    if (body.action === "detect_winner") {
      const winnerVariantId = await AbTestingService.detectWinner(experimentId);
      return res.status(200).json({ winnerVariantId });
    }
    const variantId = typeof body.variantId === "string" ? body.variantId : "";
    const eventType = typeof body.eventType === "string" ? body.eventType : "";
    if (!variantId || !eventType) return res.status(400).json({ error: "variantId y eventType son requeridos" });
    await AbTestingService.recordEvent(variantId, eventType as "impression" | "click" | "conversion");
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("inválido") || msg.includes("requerido")) return res.status(400).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
