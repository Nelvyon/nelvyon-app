import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { SentimentLabel } from "../../../../../../../backend/saas/SentimentMonitorService";
import { getSentimentMonitorService } from "../../../../../../../backend/saas/SentimentMonitorService";

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
    const user = await getAuthService().verifyToken(token);
    const channel = readOne(req.query.channel);
    const label = readOne(req.query.label) as SentimentLabel | undefined;
    const fromDate = readOne(req.query.fecha);
    const page = Number.parseInt(readOne(req.query.page) ?? "1", 10);
    const pageSize = Number.parseInt(readOne(req.query.pageSize) ?? "20", 10);
    const out = await getSentimentMonitorService().getMentions(user.userId, { channel, label, fromDate, page, pageSize });
    return res.status(200).json(out);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
