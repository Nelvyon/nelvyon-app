import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { ClientProfileService } from "../../../../../../backend/os-agents/client-profile/ClientProfileService";
import type { ClientProfileUpsert } from "../../../../../../backend/os-agents/client-profile/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const profiles = await ClientProfileService.listProfiles(user.userId);
      return res.status(200).json({ profiles });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
      const payload: ClientProfileUpsert = {
        brand_name: typeof body.brand_name === "string" ? body.brand_name : "",
        brand_voice: typeof body.brand_voice === "string" ? body.brand_voice : undefined,
        target_audience: typeof body.target_audience === "string" ? body.target_audience : undefined,
        industry: typeof body.industry === "string" ? body.industry : undefined,
        usp: typeof body.usp === "string" ? body.usp : undefined,
        competitors: Array.isArray(body.competitors) ? body.competitors.filter((x): x is string => typeof x === "string") : undefined,
        colors: Array.isArray(body.colors) ? body.colors.filter((x): x is string => typeof x === "string") : undefined,
        keywords: Array.isArray(body.keywords) ? body.keywords.filter((x): x is string => typeof x === "string") : undefined,
        past_results: body.past_results,
        preferences: body.preferences,
      };
      if (!payload.brand_name?.trim()) return res.status(400).json({ error: "brand_name es requerido" });
      const profile = await ClientProfileService.upsertProfile(user.userId, payload);
      return res.status(200).json({ profile });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
