import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getWhatsAppService } from "../../../../../../../backend/integrations/WhatsAppService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const phoneNumberId = typeof req.body?.phoneNumberId === "string" ? req.body.phoneNumberId.trim() : "";
    const wabaId = typeof req.body?.wabaId === "string" ? req.body.wabaId.trim() : "";
    const accessToken = typeof req.body?.accessToken === "string" ? req.body.accessToken.trim() : "";
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: "phoneNumberId y accessToken son requeridos" });
    }

    await getWhatsAppService().saveCredentials(user.userId, phoneNumberId, wabaId, accessToken);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "whatsapp_validation") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
