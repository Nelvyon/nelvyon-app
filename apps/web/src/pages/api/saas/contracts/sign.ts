import type { NextApiRequest, NextApiResponse } from "next";

import { getDigitalContractsService } from "../../../../../../../backend/saas/DigitalContractsService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const signatureData = typeof req.body?.signatureData === "string" ? req.body.signatureData : "";
    if (!token || !signatureData) return res.status(400).json({ error: "token y signatureData requeridos" });
    const out = await getDigitalContractsService().signContract(token, signatureData);
    return res.status(200).json(out);
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}
