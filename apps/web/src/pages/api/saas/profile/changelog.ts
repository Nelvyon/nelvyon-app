import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasProfileService } from "../../../../../../../backend/saas/SaasProfileService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const raw = req.query.limit;
    const limitStr = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    const limit = limitStr !== undefined ? Number.parseInt(limitStr, 10) : 20;
    const safeLimit = Number.isFinite(limit) ? limit : 20;

    const changelog = await saasProfileService.getChangeLog(user.userId, safeLimit);
    return res.status(200).json({ changelog });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
