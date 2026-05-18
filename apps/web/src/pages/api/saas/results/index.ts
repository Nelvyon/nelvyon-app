import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasResultsService } from "../../../../../../../backend/saas/SaasResultsService";

function readOne(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    const serviceId = readOne(req.query.serviceId);
    const status = readOne(req.query.status);
    const limitRaw = readOne(req.query.limit);
    const offsetRaw = readOne(req.query.offset);
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
    const offset = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;

    const safeLimit = Number.isFinite(limit) ? limit : 20;
    const safeOffset = Number.isFinite(offset) ? offset : 0;

    const { results, total } = await saasResultsService.getResults({
      userId: user.userId,
      tenantId: user.tenantId,
      serviceId,
      status,
      limit: safeLimit,
      offset: safeOffset,
    });

    return res.status(200).json({ results, total, limit: Math.min(Math.max(safeLimit, 1), 100), offset: Math.max(safeOffset, 0) });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
