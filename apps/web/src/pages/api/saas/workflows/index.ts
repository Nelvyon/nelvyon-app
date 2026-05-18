import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getDragDropWorkflowService } from "../../../../../../../backend/saas/DragDropWorkflowService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const workflows = await getDragDropWorkflowService().listWorkflows(user.userId);
      return res.status(200).json({ workflows });
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description : null;
    const nodes = Array.isArray(req.body?.nodes) ? req.body.nodes : [];
    const edges = Array.isArray(req.body?.edges) ? req.body.edges : [];
    if (!name) return res.status(400).json({ error: "name es requerido" });
    const workflow = await getDragDropWorkflowService().createWorkflow(user.userId, name, description, nodes, edges);
    return res.status(201).json({ workflow });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
