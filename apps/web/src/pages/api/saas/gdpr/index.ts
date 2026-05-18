import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasGdprService } from "../../../../../../../backend/saas/SaasGdprService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const requests = await saasGdprService.getRequests(user.userId);
      return res.status(200).json({ requests });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const type = body.type;

      if (type === "export") {
        await saasGdprService.requestExport(user.userId, user.tenantId);
        const data = await saasGdprService.exportUserData(user.userId, user.tenantId);
        return res.status(200).json({ data });
      }

      if (type === "delete") {
        await saasGdprService.requestDeletion(user.userId, user.tenantId);
        await saasGdprService.deleteUserData(user.userId, user.tenantId);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: "Tipo inválido. Use export o delete." });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
