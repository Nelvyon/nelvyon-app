import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { creatorsAgentService, type CreatorAgentSlug } from "../../../../../../../backend/os-agents/creators/CreatorsAgentService";

const VALID_AGENTS: ReadonlySet<CreatorAgentSlug> = new Set([
  "video-montage",
  "thumbnail",
  "script-writer",
  "multilingual-subtitles",
  "viral-clip",
  "youtube-seo",
  "newsletter-creator",
  "merch-design",
  "bio-link-page",
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const rawAgent = typeof req.query.agent === "string" ? req.query.agent : Array.isArray(req.query.agent) ? req.query.agent[0] : undefined;
    if (!rawAgent || !VALID_AGENTS.has(rawAgent as CreatorAgentSlug)) {
      return res.status(400).json({ error: "Agente inválido" });
    }

    const params = req.body && typeof req.body.params === "object" && req.body.params !== null ? (req.body.params as Record<string, unknown>) : {};
    const result = await creatorsAgentService.executeBySlug(rawAgent as CreatorAgentSlug, user.userId, params);
    return res.status(200).json(result);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
