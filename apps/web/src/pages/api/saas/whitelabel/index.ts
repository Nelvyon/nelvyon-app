import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasWhiteLabelService } from "../../../../../../../backend/saas/SaasWhiteLabelService";

function readString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    if (req.method === "GET") {
      const config = await saasWhiteLabelService.getConfig(user.tenantId);
      return res.status(200).json({ config });
    }

    if (req.method === "PUT") {
      const b = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const patch = {
        agencyName: readString(b.agencyName),
        logoUrl: readString(b.logoUrl),
        primaryColor: readString(b.primaryColor),
        secondaryColor: readString(b.secondaryColor),
        customDomain: readString(b.customDomain),
        faviconUrl: readString(b.faviconUrl),
        supportEmail: readString(b.supportEmail),
        footerText: readString(b.footerText),
        hideNelvyonBranding:
          typeof b.hideNelvyonBranding === "boolean" ? b.hideNelvyonBranding : undefined,
      };
      const config = await saasWhiteLabelService.upsertConfig(user.tenantId, patch);
      return res.status(200).json({ config });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
