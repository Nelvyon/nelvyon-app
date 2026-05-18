import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { learningService } from "../../../../../../../backend/os-agents/learning/LearningService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    const outputId = typeof body.outputId === "string" ? body.outputId.trim() : "";
    const outcomeType = typeof body.outcomeType === "string" ? body.outcomeType.trim() : "";
    const outcomeValue = typeof body.outcomeValue === "number" ? body.outcomeValue : Number(body.outcomeValue ?? 0);
    const feedback = typeof body.feedback === "string" ? body.feedback : undefined;
    const sector = typeof body.sector === "string" && body.sector.trim() ? body.sector.trim() : "unknown";
    if (!agentId || !outcomeType) return res.status(400).json({ error: "agentId y outcomeType son requeridos" });
    await learningService.recordOutcome(
      user.userId,
      agentId,
      sector,
      { outputId, ...body },
      { outputId },
      outcomeType,
      Number.isFinite(outcomeValue) ? outcomeValue : 0,
      feedback,
    );
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
