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
    const botToken = typeof req.body?.botToken === "string" ? req.body.botToken.trim() : "";
    const chatId = typeof req.body?.chatId === "string" ? req.body.chatId.trim() : "";
    const botUsername = typeof req.body?.botUsername === "string" ? req.body.botUsername.trim() : "";
    if (!botToken || !chatId) {
      return res.status(400).json({ error: "botToken y chatId son requeridos" });
    }

    await getTelegramService().saveCredentials(user.userId, botToken, chatId, botUsername);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "telegram_validation") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
