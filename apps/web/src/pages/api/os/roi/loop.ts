import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getClosedLoopRoiService } from "../../../../../../../backend/os-agents/ClosedLoopRoiService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "POST") {
      const loop = await getClosedLoopRoiService().createLoop(user.userId);
      return res.status(200).json({ loop });
    }

    const loopId = typeof req.body?.loopId === "string" ? req.body.loopId : "";
    if (!loopId) return res.status(400).json({ error: "loopId es requerido" });
    const loop = await getClosedLoopRoiService().closeLoop(loopId, user.userId);
    return res.status(200).json({ loop });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    if (e instanceof OsAgentError && e.code === "roi_not_found") return res.status(404).json({ error: e.message });
    return res.status(500).json({ error: "Error interno" });
  }
}
