import type { NextApiRequest, NextApiResponse } from "next";

import type { HeatmapSessionData, HeatmapTrackEvent } from "../../../../../../../backend/saas/HeatmapService";
import { getHeatmapService } from "../../../../../../../backend/saas/HeatmapService";

function cors(res: NextApiResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body as {
      siteId?: string;
      sessionId?: string;
      type?: string;
      payload?: Record<string, unknown>;
    };
    const siteId = typeof body?.siteId === "string" ? body.siteId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    if (!siteId || !sessionId) return res.status(400).json({ error: "siteId y sessionId requeridos" });

    const svc = getHeatmapService();

    if (body.type === "session" && body.payload) {
      const p = body.payload;
      const deviceRaw = typeof p.device === "string" ? p.device : "desktop";
      const device =
        deviceRaw === "mobile" || deviceRaw === "tablet" || deviceRaw === "desktop" ? deviceRaw : "desktop";
      const data: HeatmapSessionData = {
        userAgent: typeof p.userAgent === "string" ? p.userAgent : "",
        page: typeof p.page === "string" ? p.page : "",
        referrer: typeof p.referrer === "string" ? p.referrer : undefined,
        duration: typeof p.duration === "number" ? p.duration : undefined,
        scrollDepth: typeof p.scrollDepth === "number" ? p.scrollDepth : undefined,
        device,
      };
      await svc.trackSession(siteId, sessionId, data);
      return res.status(200).json({ ok: true });
    }

    if (body.type === "event" && body.payload) {
      const p = body.payload;
      const t = typeof p.type === "string" ? p.type : "";
      const allowed = ["click", "move", "scroll", "pageview", "rage_click", "u_turn"];
      if (!allowed.includes(t)) return res.status(400).json({ error: "tipo de evento inválido" });
      const event: HeatmapTrackEvent = {
        type: t as HeatmapTrackEvent["type"],
        x: typeof p.x === "number" ? p.x : undefined,
        y: typeof p.y === "number" ? p.y : undefined,
        page: typeof p.page === "string" ? p.page : "",
        element: typeof p.element === "string" ? p.element : undefined,
        timestamp: typeof p.timestamp === "number" ? p.timestamp : Date.now(),
      };
      await svc.trackEvent(siteId, sessionId, event);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "type debe ser session o event" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("inválido")) return res.status(404).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
