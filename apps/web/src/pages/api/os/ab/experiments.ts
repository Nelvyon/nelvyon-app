import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { AbAgentService } from "../../../../../../../backend/os-agents/ab-testing/AbAgentService";
import { AbTestingService } from "../../../../../../../backend/os-agents/ab-testing/AbTestingService";

const CHANNELS = new Set(["email", "social", "ads", "landing"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const experiments = await AbTestingService.getExperiments(user.userId, status);
      return res.status(200).json({ experiments });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "object" && req.body != null ? req.body : {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const channel = typeof body.channel === "string" ? body.channel.trim().toLowerCase() : "";
      const baseContent = typeof body.baseContent === "string" ? body.baseContent.trim() : "";
      const nVariants = typeof body.nVariants === "number" ? body.nVariants : Number(body.nVariants ?? 2);
      if (!name || !channel || !baseContent) return res.status(400).json({ error: "name, channel y baseContent son requeridos" });
      if (!CHANNELS.has(channel)) return res.status(400).json({ error: "channel inválido" });
      const experiment = await new AbAgentService().generateVariants(
        user.userId,
        channel as "email" | "social" | "ads" | "landing",
        baseContent,
        nVariants,
        name,
      );
      return res.status(200).json({ experiment });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
