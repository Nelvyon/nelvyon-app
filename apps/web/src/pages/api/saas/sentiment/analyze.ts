import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getSentimentMonitorService } from "../../../../../../../backend/saas/SentimentMonitorService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const channel = typeof req.body?.channel === "string" ? req.body.channel : "web";
    if (!text.trim()) return res.status(400).json({ error: "text requerido" });
    const sentiment = await getSentimentMonitorService().analyzeSentiment(user.userId, text, channel);
    return res.status(200).json(sentiment);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
