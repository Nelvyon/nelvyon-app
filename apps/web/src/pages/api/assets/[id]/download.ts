import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents/OsAgentError";

import { osAssetStore } from "../../../../../../../backend/os-agents/assets/OsAssetStore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const rawId = req.query.id;
    const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
    if (!id) return res.status(400).json({ error: "Id requerido" });

    const asset = await osAssetStore.getAssetById(id, user.userId);
    if (!asset) return res.status(404).json({ error: "Activo no encontrado" });

    return res.redirect(302, asset.url);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
