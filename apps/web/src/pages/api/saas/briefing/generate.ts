import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { BriefingInput } from "../../../../../../../backend/saas/ClientBriefingService";
import { getClientBriefingService } from "../../../../../../../backend/saas/ClientBriefingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const input = (req.body && typeof req.body === "object" ? req.body : {}) as BriefingInput;
    if (!input.companyName || !input.industry) return res.status(400).json({ error: "companyName e industry son requeridos" });
    const svc = getClientBriefingService();
    const result = await svc.generateBriefing(user.userId, input);
    const briefing = await svc.saveBriefing(user.userId, input, result);
    return res.status(201).json({ briefing });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
