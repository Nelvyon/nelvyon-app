import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { AttributionService } from "../../../../../../../backend/os-agents/attribution/AttributionService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const q = req.query;
      const channel = typeof q.channel === "string" ? q.channel : undefined;
      const converted =
        typeof q.converted === "string" ? (q.converted === "true" ? true : q.converted === "false" ? false : undefined) : undefined;
      const dateFrom = typeof q.dateFrom === "string" ? q.dateFrom : undefined;
      const dateTo = typeof q.dateTo === "string" ? q.dateTo : undefined;
      const touchpoints = await AttributionService.getTouchpoints(user.userId, { channel, converted, dateFrom, dateTo });
      return res.status(200).json({ touchpoints });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
      const channel = typeof body.channel === "string" ? body.channel : "";
      if (!channel.trim()) return res.status(400).json({ error: "channel requerido" });
      const touchpoint = await AttributionService.recordTouchpoint(user.userId, {
        channel: channel.trim(),
        campaign: typeof body.campaign === "string" ? body.campaign : null,
        source: typeof body.source === "string" ? body.source : null,
        medium: typeof body.medium === "string" ? body.medium : null,
        content: typeof body.content === "string" ? body.content : null,
        converted: Boolean(body.converted),
        revenue: typeof body.revenue === "number" ? body.revenue : Number(body.revenue ?? 0),
        contactId: typeof body.contactId === "string" ? body.contactId : null,
      });
      return res.status(200).json({ touchpoint });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
