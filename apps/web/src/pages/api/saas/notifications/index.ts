import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasNotificationService } from "../../../../../../../backend/saas/SaasNotificationService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    if (req.method === "GET") {
      const raw = req.query.limit;
      const limitStr = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
      const limit = limitStr !== undefined ? Number.parseInt(limitStr, 10) : 50;
      const notifications = await saasNotificationService.getNotifications(user.userId, user.tenantId, Number.isFinite(limit) ? limit : 50);
      return res.status(200).json({ notifications });
    }

    if (req.method === "PUT") {
      const updated = await saasNotificationService.markAllRead(user.userId, user.tenantId);
      return res.status(200).json({ marked: updated });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
