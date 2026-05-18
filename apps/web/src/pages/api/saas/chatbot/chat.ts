import type { NextApiRequest, NextApiResponse } from "next";

import type { ChatMessage } from "../../../../../../../backend/saas/ChatbotService";
import { getChatbotService } from "../../../../../../../backend/saas/ChatbotService";

function setCors(res: NextApiResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body as {
      chatbotId?: string;
      sessionId?: string;
      message?: string;
      history?: ChatMessage[];
    };
    const chatbotId = typeof body?.chatbotId === "string" ? body.chatbotId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const message = typeof body?.message === "string" ? body.message : "";
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!chatbotId || !sessionId || !message.trim()) {
      return res.status(400).json({ error: "chatbotId, sessionId y message son requeridos" });
    }

    const svc = getChatbotService();
    const result = await svc.chat(chatbotId, sessionId, message.trim(), history);

    const nextHistory: ChatMessage[] = [...history, { role: "user", content: message.trim() }, { role: "assistant", content: result.response }];
    await svc.saveConversation(chatbotId, sessionId, nextHistory, {
      capturedLead: result.capturedLead,
      shouldEscalate: result.shouldEscalate,
    });

    return res.status(200).json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("no encontrado")) return res.status(404).json({ error: "Chatbot no encontrado" });
    return res.status(500).json({ error: "Error interno" });
  }
}
