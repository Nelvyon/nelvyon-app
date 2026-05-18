import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { getInvoicingService } from "../../../../../../../backend/saas/InvoicingService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);
    const invoiceId = typeof req.body?.invoiceId === "string" ? req.body.invoiceId : "";
    if (!invoiceId) return res.status(400).json({ error: "invoiceId requerido" });

    const reminder = await getInvoicingService().sendReminder(invoiceId, user.userId);
    return res.status(200).json(reminder);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const message = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: message });
  }
}
