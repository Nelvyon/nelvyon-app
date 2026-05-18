import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getWhatsAppService } from "../../../../../../../backend/integrations/WhatsAppService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const limRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = limRaw ? Number.parseInt(limRaw, 10) : 50;
    if (Number.isNaN(limit) || limit < 1) {
      return res.status(400).json({ error: "limit debe ser un número ≥ 1" });
    }

    const messages = await getWhatsAppService().getMessageHistory(user.userId, limit);
    return res.status(200).json({ messages });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
