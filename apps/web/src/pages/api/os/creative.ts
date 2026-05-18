import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { CreativeService } from "../../../../../../backend/os-agents/creative/CreativeService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
    const type = body.type === "image" || body.type === "video" ? body.type : null;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : undefined;

    if (!type || !prompt) return res.status(400).json({ error: "type y prompt son requeridos" });

    const asset =
      type === "image"
        ? await CreativeService.generateImage(prompt, user.userId, agentId ?? null)
        : await CreativeService.generateVideo(prompt, user.userId, agentId ?? null);

    return res.status(200).json({ asset });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
