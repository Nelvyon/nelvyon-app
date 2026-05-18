import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CrmService } from "../../../../../../../../../backend/os-agents/crm/CrmService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "id requerido" });

    const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
    const stage = typeof body.stage === "string" ? body.stage : "";
    if (!stage) return res.status(400).json({ error: "stage requerido" });

    const contact = await CrmService.updateStage(id, user.userId, stage);
    return res.status(200).json({ contact });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Contacto no encontrado" || msg === "stage inválido") return res.status(400).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
