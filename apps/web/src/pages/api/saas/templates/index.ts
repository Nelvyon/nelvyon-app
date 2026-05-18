import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getTemplateMarketplaceService } from "../../../../../../../backend/saas/TemplateMarketplaceService";

function one(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    await getAuthService().verifyToken(token);
    const sector = one(req.query.sector);
    const type = one(req.query.type);
    const search = one(req.query.search);
    const page = Number.parseInt(one(req.query.page) ?? "1", 10);
    const data = await getTemplateMarketplaceService().getTemplates({ sector, type, search, page });
    return res.status(200).json(data);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
