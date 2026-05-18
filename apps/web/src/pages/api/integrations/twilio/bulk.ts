import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getTwilioService } from "../../../../../../../backend/integrations/TwilioService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const recipients = req.body?.recipients;
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "recipients debe ser un array no vacío" });
    }
    if (!body.trim()) {
      return res.status(400).json({ error: "body es requerido" });
    }

    const strings = recipients.map((r: unknown) => (typeof r === "string" ? r : ""));
    const out = await getTwilioService().sendBulkSms(user.userId, strings, body);
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "twilio_auth") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
