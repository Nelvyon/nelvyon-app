import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "../../../../../../../../backend/auth/AuthService";
import { saasPublicApiService, type ApiKeyConfig, maskApiKey } from "../../../../../../../../backend/saas/SaasPublicApiService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();
  let statusCode = 500;
  let apiKeyIdForLog: string | null = null;
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) {
      statusCode = 401;
      return res.status(401).json({ error: "No autenticado" });
    }
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const keys = await saasPublicApiService.listApiKeys(user.userId);
      statusCode = 200;
      return res.status(200).json({
        keys: keys.map((k: ApiKeyConfig) => ({ ...k, keyHash: maskApiKey(k.keyHash) })),
      });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : "Default key";
      const created = await saasPublicApiService.generateApiKey(user.userId, name);
      apiKeyIdForLog = created.config.id;
      statusCode = 200;
      return res.status(200).json(created);
    }

    statusCode = 405;
    return res.status(405).json({ error: "Method not allowed" });
  } catch {
    statusCode = 500;
    return res.status(500).json({ error: "Error interno" });
  } finally {
    if (apiKeyIdForLog) {
      await saasPublicApiService.logUsage(apiKeyIdForLog, "/api/public/v1/keys", req.method ?? "GET", statusCode, Date.now() - started);
    }
  }
}
