import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getColdEmailService } from "../../../../../../../backend/saas/ColdEmailService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { prospectId?: string } | undefined;
    const prospectId = typeof body?.prospectId === "string" ? body.prospectId.trim() : "";
    if (!prospectId) return res.status(400).json({ error: "prospectId requerido" });

    const prospect = await getColdEmailService().detectReply(prospectId, user.userId);
    if (!prospect) return res.status(404).json({ error: "Prospecto no encontrado" });

    return res.status(200).json({ prospect });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
