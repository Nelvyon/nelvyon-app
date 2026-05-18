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
    const recipient = typeof req.body?.recipient === "string" ? req.body.recipient.trim() : "";
    const templateName = typeof req.body?.templateName === "string" ? req.body.templateName.trim() : "";
    const languageCode = typeof req.body?.languageCode === "string" ? req.body.languageCode.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message : "";
    const rawComponents = req.body?.components;

    if (!recipient) return res.status(400).json({ error: "recipient es requerido" });

    let components: ReadonlyArray<Record<string, unknown>> = [];
    if (Array.isArray(rawComponents)) {
      components = rawComponents.map((x) =>
        typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {},
      );
    }

    const isTemplate = Boolean(templateName && languageCode);
    if (!isTemplate && !message.trim()) {
      return res.status(400).json({ error: "message (texto) o templateName+languageCode son requeridos" });
    }

    if (isTemplate) {
      const out = await getWhatsAppService().sendTemplateMessage(
        user.userId,
        recipient,
        templateName,
        languageCode,
        components,
      );
      return res.status(200).json(out);
    }

    const out = await getWhatsAppService().sendTextMessage(user.userId, recipient, message);
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "whatsapp_auth") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "whatsapp_validation") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "whatsapp_api") return res.status(502).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
