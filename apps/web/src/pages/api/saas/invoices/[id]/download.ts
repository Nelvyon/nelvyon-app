import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasInvoiceService } from "../../../../../../../../backend/saas/SaasInvoiceService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const raw = req.query.id;
    const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!id) return res.status(400).json({ error: "Id requerido" });

    const invoice = await saasInvoiceService.getInvoiceById(id, user.userId);
    if (!invoice) return res.status(404).json({ error: "Factura no encontrada" });

    if (invoice.pdfUrl) {
      return res.redirect(302, invoice.pdfUrl);
    }
    return res.status(200).json({ invoice });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
