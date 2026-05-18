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

    const body = req.body as { audioUrl?: string; language?: string; context?: string } | undefined;
    const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl.trim() : "";
    if (!audioUrl) return res.status(400).json({ error: "audioUrl requerido" });

    const language = typeof body?.language === "string" && body.language.trim() ? body.language.trim() : undefined;
    const context = parseContext(body?.context);

    const svc = getTranscriptionService();
    const record = await svc.processTranscription(user.userId, audioUrl, language, context);
    return res.status(201).json({ record });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    const msg = e instanceof Error ? e.message : "Error interno";
    return res.status(500).json({ error: msg });
  }
}
