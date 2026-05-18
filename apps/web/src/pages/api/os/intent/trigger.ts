import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { IntentScore } from "../../../../../../../backend/os-agents/IntentMulticanalService";
import { getIntentMulticanalService } from "../../../../../../../backend/os-agents/IntentMulticanalService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const contactData =
      req.body?.contactData && typeof req.body.contactData === "object"
        ? (req.body.contactData as { contactId?: string; email?: string; phone?: string; name?: string; signalId?: string })
        : {};
    const intentScore = (req.body?.intentScore ?? { score: 0, intentLevel: "low", reasoning: "" }) as IntentScore;
    if (!contactData.contactId) return res.status(400).json({ error: "contactData.contactId es requerido" });

    const result = await getIntentMulticanalService().triggerMulticanalResponse(
      user.userId,
      {
        contactId: contactData.contactId,
        email: contactData.email,
        phone: contactData.phone,
        name: contactData.name,
        signalId: contactData.signalId,
      } as typeof contactData & { contactId: string },
      intentScore,
    );
    return res.status(200).json({ result });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
