import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type {
  EnhanceScriptInput,
  ThumbnailInput,
  VideoPlatform,
} from "../../../../../../../backend/os-agents/videoEnhancerAgent";
import { getVideoEnhancerAgent } from "../../../../../../../backend/os-agents/videoEnhancerAgent";

const PLATFORMS: VideoPlatform[] = ["youtube", "tiktok", "instagram", "linkedin"];

function parseScriptInput(body: Record<string, unknown> | undefined): EnhanceScriptInput | null {
  if (!body) return null;
  const originalScript = typeof body.originalScript === "string" ? body.originalScript.trim() : "";
  const platformRaw = typeof body.platform === "string" ? body.platform.trim() : "";
  const platform = PLATFORMS.includes(platformRaw as VideoPlatform) ? (platformRaw as VideoPlatform) : null;
  if (!originalScript || !platform) return null;
  const targetDuration =
    typeof body.targetDuration === "number" && Number.isFinite(body.targetDuration)
      ? body.targetDuration
      : typeof body.targetDuration === "string"
        ? Number(body.targetDuration)
        : undefined;
  const tone = typeof body.tone === "string" ? body.tone.trim() : undefined;
  return {
    originalScript,
    platform,
    targetDuration: targetDuration !== undefined && Number.isFinite(targetDuration) ? targetDuration : undefined,
    tone: tone || undefined,
  };
}

function parseThumbnailInput(body: Record<string, unknown> | undefined): ThumbnailInput | null {
  if (!body) return null;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform.trim() : "";
  if (!title || !platform) return null;
  const style = typeof body.style === "string" ? body.style.trim() : undefined;
  const brandColors = Array.isArray(body.brandColors)
    ? body.brandColors.map((c) => String(c ?? "").trim()).filter(Boolean)
    : undefined;
  return {
    title,
    platform,
    style: style || undefined,
    brandColors: brandColors && brandColors.length > 0 ? brandColors : undefined,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const agent = getVideoEnhancerAgent();

    if (req.method === "GET") {
      const enhancements = await agent.getEnhancements(user.userId);
      return res.status(200).json({ enhancements });
    }

    if (req.method === "POST") {
      const body = req.body as Record<string, unknown> | undefined;
      const action = typeof body?.action === "string" ? body.action.trim() : "";

      if (action === "script") {
        const input = parseScriptInput(body);
        if (!input) {
          return res.status(400).json({ error: "originalScript y platform válidos son requeridos" });
        }
        const result = await agent.enhanceScript(user.userId, input);
        const enhancement = await agent.saveEnhancement(user.userId, "script", input, result);
        return res.status(200).json({ result, enhancement });
      }

      if (action === "thumbnail") {
        const input = parseThumbnailInput(body);
        if (!input) {
          return res.status(400).json({ error: "title y platform son requeridos" });
        }
        const result = await agent.generateThumbnail(user.userId, input);
        const enhancement = await agent.saveEnhancement(user.userId, "thumbnail", input, result);
        return res.status(200).json({ result, enhancement });
      }

      if (action === "subtitles") {
        const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
        if (!transcript) {
          return res.status(400).json({ error: "transcript es requerido" });
        }
        const result = await agent.generateSubtitles(user.userId, transcript);
        const enhancement = await agent.saveEnhancement(user.userId, "subtitles", { transcript }, result);
        return res.status(200).json({ result, enhancement });
      }

      return res.status(400).json({ error: "action debe ser script, thumbnail o subtitles" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
