import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CrmService } from "../../../../../../../../../backend/os-agents/crm/CrmService";

const TYPES = new Set(["email", "call", "meeting", "note", "agent_output"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "id requerido" });

    if (req.method === "GET") {
      const activities = await CrmService.getActivities(id, user.userId);
      return res.status(200).json({ activities });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
      const type = typeof body.type === "string" ? body.type : "";
      const summary = typeof body.summary === "string" ? body.summary : null;
      const agentId = typeof body.agentId === "string" ? body.agentId : null;
      if (!TYPES.has(type)) return res.status(400).json({ error: "type inválido" });
      const activity = await CrmService.logActivity(id, user.userId, type, summary, agentId);
      return res.status(200).json({ activity });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Contacto no encontrado") return res.status(404).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
