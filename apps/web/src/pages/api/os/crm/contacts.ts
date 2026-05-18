import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CrmService } from "../../../../../../../backend/os-agents/crm/CrmService";
import type { CrmContactUpsert } from "../../../../../../../backend/os-agents/crm/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const q = req.query;
      const stage = typeof q.stage === "string" ? q.stage : undefined;
      const industry = typeof q.industry === "string" ? q.industry : undefined;
      const minScoreRaw = typeof q.minScore === "string" ? q.minScore : undefined;
      const minScore = minScoreRaw != null ? Number(minScoreRaw) : undefined;
      const contacts = await CrmService.getContacts(user.userId, {
        stage,
        industry,
        minScore: typeof minScore === "number" && !Number.isNaN(minScore) ? minScore : undefined,
      });
      return res.status(200).json({ contacts });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
      const payload: CrmContactUpsert = {
        id: typeof body.id === "string" ? body.id : undefined,
        name: typeof body.name === "string" ? body.name : "",
        email: typeof body.email === "string" ? body.email : body.email === null ? null : undefined,
        phone: typeof body.phone === "string" ? body.phone : body.phone === null ? null : undefined,
        company: typeof body.company === "string" ? body.company : body.company === null ? null : undefined,
        industry: typeof body.industry === "string" ? body.industry : body.industry === null ? null : undefined,
        stage: typeof body.stage === "string" ? body.stage : undefined,
        tags: Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : undefined,
        notes: typeof body.notes === "string" ? body.notes : body.notes === null ? null : undefined,
        metadata: body.metadata,
      };
      if (!payload.name?.trim()) return res.status(400).json({ error: "name es requerido" });
      const contact = await CrmService.upsertContact(user.userId, payload);
      return res.status(200).json({ contact });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Contacto no encontrado") return res.status(404).json({ error: msg });
    return res.status(500).json({ error: "Error interno" });
  }
}
