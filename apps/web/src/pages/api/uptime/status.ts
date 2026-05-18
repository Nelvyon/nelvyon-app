import type { NextApiRequest, NextApiResponse } from "next";

import { uptimeService } from "../../../../../../backend/monitoring/UptimeService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const status = await uptimeService.getStatus();
    return res.status(200).json(status);
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}
