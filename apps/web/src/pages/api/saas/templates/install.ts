import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getTemplateMarketplaceService } from "../../../../../../../backend/saas/TemplateMarketplaceService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const templateId = typeof req.body?.templateId === "string" ? req.body.templateId : "";
    if (!templateId) return res.status(400).json({ error: "templateId requerido" });
    const result = await getTemplateMarketplaceService().installTemplate(user.userId, templateId);
    return res.status(200).json(result);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
