import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import type { LogoDesignerInput, LogoGenerateResult, SavedLogo } from "../../../../../../../backend/os-agents/logoDesignerAgent";
import { getLogoDesignerAgent } from "../../../../../../../backend/os-agents/logoDesignerAgent";

const STYLES = ["modern", "classic", "minimalist", "bold", "playful"] as const;

function parseLogoInput(body: Record<string, unknown> | undefined): LogoDesignerInput | null {
  if (!body) return null;
  const brandName = typeof body.brandName === "string" ? body.brandName.trim() : "";
  const industry = typeof body.industry === "string" ? body.industry.trim() : "";
  const styleRaw = typeof body.style === "string" ? body.style.trim() : "";
  const style = STYLES.includes(styleRaw as (typeof STYLES)[number]) ? (styleRaw as LogoDesignerInput["style"]) : null;
  if (!brandName || !industry || !style) return null;
  const colors = Array.isArray(body.colors) ? body.colors.map((c) => String(c ?? "").trim()).filter(Boolean) : undefined;
  const description = typeof body.description === "string" ? body.description.trim() : undefined;
  return {
    brandName,
    industry,
    style,
    colors: colors && colors.length > 0 ? colors : undefined,
    description: description || undefined,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const token = req.cookies.nelvyon_token;
    if (!token) return res.status(401).json({ error: "No autenticado" });
    const user = await getAuthService().verifyToken(token);

    const agent = getLogoDesignerAgent();

    if (req.method === "GET") {
      const logos = await agent.getLogos(user.userId);
      return res.status(200).json({ logos });
    }

    if (req.method === "POST") {
      const body = req.body as Record<string, unknown> | undefined;
      const input = parseLogoInput(body);
      if (!input) {
        return res.status(400).json({ error: "brandName, industry y style válidos son requeridos" });
      }
      const variants = body?.variants === true || body?.variants === "true";

      let results: LogoGenerateResult[];
      if (variants) {
        results = await agent.generateVariants(user.userId, input, 3);
      } else {
        results = [await agent.generateLogo(user.userId, input)];
      }

      const saved: SavedLogo[] = [];
      for (const r of results) {
        saved.push(await agent.saveLogo(user.userId, input, r));
      }

      return res.status(200).json({ results, saved });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") return res.status(401).json({ error: "Token inválido" });
    return res.status(500).json({ error: "Error interno" });
  }
}
