import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getAgentLanguageService } from "../../../../../../../backend/saas/AgentLanguageService";
import type { LanguagePreferenceCode } from "../../../../../../../backend/saas/AgentLanguageService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const service = getAgentLanguageService();
    if (req.method === "GET") {
      const langCode = await service.getUserLanguagePreference(user.userId);
      return res.status(200).json({ langCode });
    }
    const langCode = typeof req.body?.langCode === "string" ? req.body.langCode.toLowerCase() : "";
    if (!langCode) return res.status(400).json({ error: "langCode requerido" });
    const saved = await service.setUserLanguagePreference(user.userId, langCode as LanguagePreferenceCode);
    return res.status(200).json({ langCode: saved });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
