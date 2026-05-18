import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getIntentMulticanalService } from "../../../../../../../backend/os-agents/IntentMulticanalService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const contactId = typeof req.body?.contactId === "string" ? req.body.contactId.trim() : "";
    const signalType = typeof req.body?.signalType === "string" ? req.body.signalType.trim() : "";
    const channel = typeof req.body?.channel === "string" ? req.body.channel.trim() : "";
    const metadata =
      req.body?.metadata && typeof req.body.metadata === "object" ? (req.body.metadata as Record<string, unknown>) : {};
    if (!contactId || !signalType || !channel) {
      return res.status(400).json({ error: "contactId, signalType y channel son requeridos" });
    }

    const signal = await getIntentMulticanalService().processSignal(user.userId, contactId, signalType, channel, metadata);
    return res.status(200).json({ signal });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
