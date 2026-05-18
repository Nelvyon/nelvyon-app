import type { NextApiRequest, NextApiResponse } from "next";

import { getChatbotService } from "../../../../../../../backend/saas/ChatbotService";

function resolveOrigin(req: NextApiRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = req.headers.host;
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return "http://localhost:3000";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const chatbotId = typeof req.query.chatbotId === "string" ? req.query.chatbotId.trim() : "";
    if (!chatbotId) return res.status(400).json({ error: "chatbotId requerido" });

    const bot = await getChatbotService().getChatbotById(chatbotId);
    if (!bot) return res.status(404).json({ error: "Chatbot no encontrado" });

    const origin = resolveOrigin(req);
    const snippet = await getChatbotService().generateEmbedCode(chatbotId, origin);
    return res.status(200).json({ snippet, chatbotId });
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}
