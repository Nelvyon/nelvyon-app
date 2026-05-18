import { randomUUID } from "node:crypto";

import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getClosedLoopRoiService } from "../../../../../../../backend/os-agents/ClosedLoopRoiService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : randomUUID();
    const channel = typeof req.body?.channel === "string" ? req.body.channel.trim() : "";
    const contactData =
      req.body?.contactData && typeof req.body.contactData === "object"
        ? (req.body.contactData as Record<string, unknown>)
        : {};
    if (!channel) return res.status(400).json({ error: "channel es requerido" });

    await getClosedLoopRoiService().startNurturingSequence(user.userId, sessionId, contactData, channel);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "roi_validation") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
