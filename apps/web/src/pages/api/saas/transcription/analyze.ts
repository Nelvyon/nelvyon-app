import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import {
  getTranscriptionService,
  type TranscriptionContext,
} from "../../../../../../../backend/saas/TranscriptionService";

const CONTEXTS: TranscriptionContext[] = ["meeting", "podcast", "interview", "lecture", "call"];

function parseContext(v: unknown): TranscriptionContext {
  if (typeof v === "string" && CONTEXTS.includes(v as TranscriptionContext)) return v as TranscriptionContext;
  return "meeting";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const body = req.body as { text?: string; context?: string } | undefined;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return res.status(400).json({ error: "text requerido" });

    const context = parseContext(body?.context);

    const svc = getTranscriptionService();
    const analysis = await svc.analyzeTranscription(user.userId, text, context);
    return res.status(200).json({ analysis });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: msg });
  }
}
