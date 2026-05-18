import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { saasProfileService } from "../../../../../../../backend/saas/SaasProfileService";

function readString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const auth = getAuthService();
    const user = await auth.verifyToken(token);

    if (req.method === "GET") {
      const profile = await saasProfileService.getProfile(user.userId, user.tenantId);
      return res.status(200).json({ profile });
    }

    if (req.method === "PUT") {
      const b = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
      const patch = {
        fullName: readString(b.fullName),
        company: readString(b.company),
        website: readString(b.website),
        phone: readString(b.phone),
        sector: readString(b.sector),
        timezone: readString(b.timezone),
        language: readString(b.language),
      };
      const hasAny = Object.values(patch).some((v) => v !== undefined);
      if (!hasAny) {
        return res.status(400).json({ error: "Nada que actualizar" });
      }
      const profile = await saasProfileService.upsertProfile(user.userId, user.tenantId, patch);
      return res.status(200).json({ profile });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return res.status(401).json({ error: "Token inválido" });
    }
    return res.status(500).json({ error: "Error interno" });
  }
}
