import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { ContractStatus } from "../../../../../../../backend/saas/DigitalContractsService";
import { getDigitalContractsService } from "../../../../../../../backend/saas/DigitalContractsService";

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
    const user = await getAuthService().verifyToken(token);
    const status = one(req.query.status) as ContractStatus | undefined;
    const fromDate = one(req.query.fromDate);
    const contracts = await getDigitalContractsService().getContracts(user.userId, { status, fromDate });
    return res.status(200).json({ contracts });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
