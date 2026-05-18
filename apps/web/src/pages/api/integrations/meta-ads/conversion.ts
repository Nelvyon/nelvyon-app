import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { ConversionEvent } from "../../../../../../../backend/integrations/MetaAdsService";
import { getMetaAdsService } from "../../../../../../../backend/integrations/MetaAdsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const user = await getAuthService().verifyToken(token);
    const raw = req.body?.event as Record<string, unknown> | undefined;
    const eventName = typeof raw?.eventName === "string" ? raw.eventName : "";
    const eventTime = typeof raw?.eventTime === "number" ? raw.eventTime : Number.NaN;
    const userData = raw?.userData && typeof raw.userData === "object" && raw.userData !== null ? (raw.userData as Record<string, string>) : {};
    const customData =
      raw?.customData && typeof raw.customData === "object" && raw.customData !== null
        ? (raw.customData as Record<string, unknown>)
        : {};
    if (!eventName || !Number.isFinite(eventTime)) {
      return res.status(400).json({ error: "event.eventName y event.eventTime válidos son requeridos" });
    }

    const event: ConversionEvent = { eventName, eventTime, userData, customData };
    const out = await getMetaAdsService().sendConversionEvent(user.userId, event);
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "meta_ads_auth") return res.status(400).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
