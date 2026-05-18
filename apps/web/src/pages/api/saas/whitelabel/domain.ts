import type { NextApiRequest, NextApiResponse } from "next";

import { saasWhiteLabelService } from "../../../../../../../backend/saas/SaasWhiteLabelService";

function readOne(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const domain = readOne(req.query.domain);
    if (!domain) return res.status(400).json({ error: "domain requerido" });
    const config = await saasWhiteLabelService.getConfigByDomain(domain);
    return res.status(200).json({ config });
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}
