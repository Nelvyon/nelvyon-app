import type { NextApiRequest, NextApiResponse } from "next";

import { agentQualityService } from "../../../../../../../backend/os-agents/AgentQualityService";

function readLimit(value: string | string[] | undefined): number | undefined {
  const raw = typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const limit = readLimit(req.query.limit);
    const top = await agentQualityService.getTopPerformingAgents(limit);
    return res.status(200).json({ top });
  } catch {
    return res.status(500).json({ error: "Error interno" });
  }
}
