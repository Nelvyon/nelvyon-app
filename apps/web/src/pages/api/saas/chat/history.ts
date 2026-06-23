import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasChatService } from "../../../../../../../backend/saas/SaasChatService";

function readOne(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    if (req.method === "GET") {
      const limitRaw = readOne(req.query.limit);
      const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
      const history = await saasChatService.getHistory(user.userId, user.tenantId, Number.isFinite(limit) ? limit : 50);
      return res.status(200).json({ messages: history });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (!content) return res.status(400).json({ error: "Mensaje requerido" });
      const out = await saasChatService.sendMessage(user.userId, user.tenantId, content);
      return res.status(200).json(out);
    }

    if (req.method === "DELETE") {
      const deleted = await saasChatService.clearHistory(user.userId, user.tenantId);
      return res.status(200).json({ deleted });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
