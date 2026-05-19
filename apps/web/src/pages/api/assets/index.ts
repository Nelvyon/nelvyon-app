import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents/OsAgentError";

import type { AssetType } from "../../../../../../backend/os-agents/assets/OsAssetStore";
import { osAssetStore } from "../../../../../../backend/os-agents/assets/OsAssetStore";

const ASSET_TYPES: ReadonlySet<string> = new Set(["image", "video", "audio", "3d", "pdf", "document"]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const rawType = req.query.type;
    const typeParam = typeof rawType === "string" ? rawType : Array.isArray(rawType) ? rawType[0] : undefined;
    const typeFilter = typeParam && ASSET_TYPES.has(typeParam) ? (typeParam as AssetType) : undefined;
    if (typeParam !== undefined && typeFilter === undefined) {
      return res.status(400).json({ error: "Tipo de activo inválido" });
    }

    const assets = await osAssetStore.getClientAssets(user.userId, user.tenantId, typeFilter);

    return res.status(200).json({ assets });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
