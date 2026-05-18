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
    const chatIds = req.body?.chatIds;
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ error: "chatIds debe ser un array no vacío" });
    }
    if (!text.trim()) {
      return res.status(400).json({ error: "text es requerido" });
    }

    const strings = chatIds.map((x: unknown) => (typeof x === "string" ? x : ""));
    const out = await getTelegramService().sendBulkMessages(user.userId, strings, text);
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "telegram_auth") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
