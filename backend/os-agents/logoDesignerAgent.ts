import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import {
  GenerativeClient,
  type GenerativeResult,
  type ImageGenerationOptions,
} from "./generative/GenerativeClient";

export type LogoStyle = "modern" | "classic" | "minimalist" | "bold" | "playful";

export type LogoDesignerInput = {
  brandName: string;
  industry: string;
  style: LogoStyle;
  colors?: string[];
  description?: string;
};

export type LogoGenerateResult = {
  imageUrl: string;
  prompt: string;
  revisedPrompt: string;
};

export type SavedLogo = {
  id: string;
  userId: string;
  brandName: string;
  input: LogoDesignerInput;
  imageUrl: string;
  prompt: string;
  revisedPrompt: string | null;
  createdAt: string;
};

export type LogoDesignerAgentDeps = {
  db?: Pick<DbClient, "query">;
  generateImage?: (
    prompt: string,
    options?: ImageGenerationOptions,
  ) => Promise<GenerativeResult>;
};

const VARIANT_FOCUS: readonly string[] = [
  "Emphasize a distinctive wordmark and refined typography.",
  "Emphasize a bold abstract symbol or icon mark.",
  "Emphasize a balanced emblem or badge composition.",
];

function buildLogoPrompt(input: LogoDesignerInput, variationSuffix?: string): string {
  const colors =
    input.colors && input.colors.length > 0 ? input.colors.join(", ") : "neutral professional palette";
  let base = `Professional logo for ${input.brandName}, ${input.industry} company, ${input.style} style, ${colors}, clean background, vector-style, high quality`;
  if (input.description?.trim()) {
    base += `. ${input.description.trim()}`;
  }
  if (variationSuffix?.trim()) {
    base += ` ${variationSuffix.trim()}`;
  }
  return base;
}

function readRevisedPrompt(result: GenerativeResult, fallbackPrompt: string): string {
  const rp = result.metadata?.revised_prompt;
  return typeof rp === "string" && rp.trim().length > 0 ? rp : fallbackPrompt;
}

function parseInput(raw: unknown): LogoDesignerInput {
  if (typeof raw !== "object" || raw === null) {
    return { brandName: "", industry: "", style: "modern" };
  }
  const o = raw as Record<string, unknown>;
  const style = o.style;
  const validStyle =
    style === "modern" ||
    style === "classic" ||
    style === "minimalist" ||
    style === "bold" ||
    style === "playful"
      ? style
      : "modern";
  return {
    brandName: typeof o.brandName === "string" ? o.brandName : "",
    industry: typeof o.industry === "string" ? o.industry : "",
    style: validStyle,
    colors: Array.isArray(o.colors) ? o.colors.map((c) => String(c)) : undefined,
    description: typeof o.description === "string" ? o.description : undefined,
  };
}

export class LogoDesignerAgent {
  constructor(private readonly deps: LogoDesignerAgentDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private async invokeImage(prompt: string): Promise<{ url: string; revisedPrompt: string }> {
    const gen = this.deps.generateImage ?? GenerativeClient.generateImage.bind(GenerativeClient);
    const result = await gen(prompt, { size: "1024x1024", quality: "hd" });
    return {
      url: result.url,
      revisedPrompt: readRevisedPrompt(result, prompt),
    };
  }

  async generateLogo(userId: string, input: LogoDesignerInput): Promise<LogoGenerateResult> {
    void userId;
    const prompt = buildLogoPrompt(input);
    const { url, revisedPrompt } = await this.invokeImage(prompt);
    return { imageUrl: url, prompt, revisedPrompt };
  }

  async generateVariants(userId: string, input: LogoDesignerInput, count = 3): Promise<LogoGenerateResult[]> {
    void userId;
    const n = Math.max(1, count);
    const out: LogoGenerateResult[] = [];
    for (let i = 0; i < n; i += 1) {
      const prompt = buildLogoPrompt(input, VARIANT_FOCUS[i % VARIANT_FOCUS.length]);
      const { url, revisedPrompt } = await this.invokeImage(prompt);
      out.push({ imageUrl: url, prompt, revisedPrompt });
    }
    return out;
  }

  async saveLogo(userId: string, input: LogoDesignerInput, result: LogoGenerateResult): Promise<SavedLogo> {
    const rows = await this.db.query<SavedLogo>(
      `INSERT INTO generated_logos (user_id, brand_name, input, image_url, prompt, revised_prompt)
       VALUES ($1::uuid, $2, $3::jsonb, $4, $5, $6)
       RETURNING id,
                 user_id AS "userId",
                 brand_name AS "brandName",
                 input,
                 image_url AS "imageUrl",
                 prompt,
                 revised_prompt AS "revisedPrompt",
                 created_at AS "createdAt"`,
      [
        userId,
        input.brandName,
        JSON.stringify(input),
        result.imageUrl,
        result.prompt,
        result.revisedPrompt,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("saveLogo: insert returned no row");
    return {
      ...row,
      input: parseInput(row.input),
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : (row.createdAt as Date).toISOString(),
    };
  }

  async getLogos(userId: string): Promise<SavedLogo[]> {
    const rows = await this.db.query<SavedLogo>(
      `SELECT id,
              user_id AS "userId",
              brand_name AS "brandName",
              input,
              image_url AS "imageUrl",
              prompt,
              revised_prompt AS "revisedPrompt",
              created_at AS "createdAt"
       FROM generated_logos
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows.map((row) => ({
      ...row,
      input: parseInput(row.input),
      createdAt:
        typeof row.createdAt === "string"
          ? row.createdAt
          : (row.createdAt as Date).toISOString(),
    }));
  }
}

let cachedLogoDesignerAgent: LogoDesignerAgent | undefined;

export function getLogoDesignerAgent(): LogoDesignerAgent {
  if (!cachedLogoDesignerAgent) cachedLogoDesignerAgent = new LogoDesignerAgent();
  return cachedLogoDesignerAgent;
}

export function resetLogoDesignerAgentForTests(): void {
  cachedLogoDesignerAgent = undefined;
}
