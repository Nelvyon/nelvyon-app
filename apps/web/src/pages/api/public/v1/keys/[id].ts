import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "../../../../../../../../backend/auth/AuthService";
import { saasPublicApiService } from "../../../../../../../../backend/saas/SaasPublicApiService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const raw = req.query.id;
    const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!id) return res.status(400).json({ error: "id requerido" });
    await saasPublicApiService.revokeApiKey(id, user.userId);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}
