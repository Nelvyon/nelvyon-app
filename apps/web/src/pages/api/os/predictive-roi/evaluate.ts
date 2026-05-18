import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { ActualResults } from "../../../../../../../backend/os-agents/PredictiveRoiService";
import { getPredictiveRoiService } from "../../../../../../../backend/os-agents/PredictiveRoiService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const predictionId = typeof req.body?.predictionId === "string" ? req.body.predictionId : "";
    const actualResults = (req.body?.actualResults ?? {}) as ActualResults;
    if (!predictionId) return res.status(400).json({ error: "predictionId es requerido" });

    const result = await getPredictiveRoiService().evaluatePrediction(user.userId, predictionId, actualResults);
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
