import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getAgentLanguageService } from "../../../../../../../backend/saas/AgentLanguageService";

function estimateConfidence(text: string): number {
  if (!text.trim()) return 0.5;
  if (/[\u4e00-\u9fff]/.test(text) || /[\u0400-\u04FF]/.test(text)) return 0.98;
  const tokens = text.trim().split(/\s+/).length;
  if (tokens >= 12) return 0.9;
  if (tokens >= 6) return 0.8;
  return 0.7;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    await getAuthService().verifyToken(token);
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!text.trim()) return res.status(400).json({ error: "text requerido" });
    const lang = getAgentLanguageService().detectLanguage(text);
    const confidence = estimateConfidence(text);
    return res.status(200).json({ lang, confidence });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
