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
    const revenue = typeof req.body?.revenue === "number" ? req.body.revenue : Number(req.body?.revenue ?? 0);
    const conversionType = typeof req.body?.conversionType === "string" ? req.body.conversionType.trim() : "purchase";
    const channel = typeof req.body?.channel === "string" ? req.body.channel.trim() : null;
    const source = typeof req.body?.source === "string" ? req.body.source.trim() : null;
    const metadata =
      req.body?.metadata && typeof req.body.metadata === "object" ? (req.body.metadata as Record<string, unknown>) : {};

    if (!Number.isFinite(revenue) || revenue < 0) return res.status(400).json({ error: "revenue inválido" });

    const conversion = await getClosedLoopRoiService().trackConversion(
      user.userId,
      sessionId,
      revenue,
      conversionType,
      channel,
      source,
      metadata,
    );
    return res.status(200).json({ conversion });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
