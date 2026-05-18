import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getTelegramService } from "../../../../../../../backend/integrations/TelegramService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const chatId = typeof req.body?.chatId === "string" ? req.body.chatId.trim() : "";
    const photoUrl = typeof req.body?.photoUrl === "string" ? req.body.photoUrl.trim() : "";
    const caption = typeof req.body?.caption === "string" ? req.body.caption : undefined;
    if (!chatId || !photoUrl) {
      return res.status(400).json({ error: "chatId y photoUrl son requeridos" });
    }

    const out = await getTelegramService().sendPhoto(user.userId, chatId, photoUrl, caption);
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "telegram_validation") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "telegram_auth") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
