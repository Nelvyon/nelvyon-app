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
    const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
    const body = typeof req.body?.body === "string" ? req.body.body : "";
    if (!to || !body.trim()) {
      return res.status(400).json({ error: "to y body son requeridos" });
    }

    const out = await getTwilioService().sendSms(user.userId, to, body);
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "twilio_validation") return res.status(400).json({ error: e.message });
    if (e instanceof OsAgentError && e.code === "twilio_auth") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
