import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { ChatbotConfigInput } from "../../../../../../../backend/saas/ChatbotService";
import { getChatbotService } from "../../../../../../../backend/saas/ChatbotService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const svc = getChatbotService();

    if (req.method === "GET") {
      const chatbot = await svc.getChatbot(user.userId);
      return res.status(200).json({ chatbot });
    }

    if (req.method === "POST") {
      const body = req.body as Partial<ChatbotConfigInput> | undefined;
      if (!body || typeof body.name !== "string" || typeof body.greeting !== "string" || typeof body.systemPrompt !== "string") {
        return res.status(400).json({ error: "name, greeting y systemPrompt son requeridos" });
      }
      const input: ChatbotConfigInput = {
        name: body.name.trim(),
        greeting: body.greeting.trim(),
        systemPrompt: body.systemPrompt.trim(),
        captureLeads: body.captureLeads === true,
        escalateKeywords: Array.isArray(body.escalateKeywords)
          ? body.escalateKeywords.map((k) => String(k ?? "").trim()).filter(Boolean)
          : [],
        primaryColor: typeof body.primaryColor === "string" ? body.primaryColor.trim() : "#6366f1",
        allowBooking: body.allowBooking === true,
        theme: body.theme === "light" ? "light" : "dark",
      };
      const chatbot = await svc.createChatbot(user.userId, input);
      return res.status(200).json({ chatbot });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
