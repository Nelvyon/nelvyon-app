import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { agentQualityService } from "../../../../../../../backend/os-agents/AgentQualityService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const jobId = typeof req.body?.jobId === "string" ? req.body.jobId : "";
    const resultId = typeof req.body?.resultId === "string" ? req.body.resultId : "";
    const rating = typeof req.body?.rating === "number" ? req.body.rating : Number.NaN;
    const feedbackText = typeof req.body?.feedbackText === "string" ? req.body.feedbackText : "";
    const sector = typeof req.body?.sector === "string" ? req.body.sector : "";

    if (!jobId || !resultId || !sector || !Number.isFinite(rating)) {
      return res.status(400).json({ error: "jobId, resultId, rating y sector son requeridos" });
    }

    const feedback = await agentQualityService.submitFeedback(user.userId, jobId, resultId, rating, feedbackText, sector);
    return res.status(201).json({ feedback });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.message.includes("Rating must be")) return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
