import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getDragDropWorkflowService } from "../../../../../../../backend/saas/DragDropWorkflowService";

function readId(v: string | string[] | undefined): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["GET", "PUT", "DELETE"].includes(req.method ?? "")) return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const id = readId(req.query.id);
    if (!id) return res.status(400).json({ error: "id requerido" });

    if (req.method === "GET") {
      const workflow = await getDragDropWorkflowService().getWorkflow(id, user.userId);
      if (!workflow) return res.status(404).json({ error: "Workflow no encontrado" });
      return res.status(200).json({ workflow });
    }

    if (req.method === "PUT") {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const nodes = Array.isArray(req.body?.nodes) ? req.body.nodes : [];
      const edges = Array.isArray(req.body?.edges) ? req.body.edges : [];
      if (!name) return res.status(400).json({ error: "name es requerido" });
      const workflow = await getDragDropWorkflowService().updateWorkflow(id, user.userId, name, nodes, edges);
      return res.status(200).json({ workflow });
    }

    await getDragDropWorkflowService().deleteWorkflow(id, user.userId);
    return res.status(200).json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
