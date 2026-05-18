import type { DbClient } from "../../db/DbClient";
import { DbClient as DbClientClass } from "../../db/DbClient";
import type { AgentQualityService } from "../AgentQualityService";
import { agentQualityService } from "../AgentQualityService";
import type { ILlmClient } from "../LlmClient";
import { LlmClient } from "../LlmClient";
import { OsAgentError } from "../OsAgentError";

export interface AgentResult {
  success: boolean;
  output: string;
  metadata: Record<string, unknown>;
}

export type CreatorAgentSlug =
  | "video-montage"
  | "thumbnail"
  | "script-writer"
  | "multilingual-subtitles"
  | "viral-clip"
  | "youtube-seo"
  | "newsletter-creator"
  | "merch-design"
  | "bio-link-page";

type CreatorAgentMethodName =
  | "videoMontage"
  | "thumbnail"
  | "scriptWriter"
  | "multilingualSubtitles"
  | "viralClip"
  | "youtubeSeO"
  | "newsletterCreator"
  | "merchDesign"
  | "bioLinkPage";

type QualityPort = Pick<AgentQualityService, "buildEnhancedPrompt" | "validateOutput">;

export type CreatorsAgentServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
  quality?: QualityPort;
};

const AGENT_MAP: Record<CreatorAgentSlug, CreatorAgentMethodName> = {
  "video-montage": "videoMontage",
  thumbnail: "thumbnail",
  "script-writer": "scriptWriter",
  "multilingual-subtitles": "multilingualSubtitles",
  "viral-clip": "viralClip",
  "youtube-seo": "youtubeSeO",
  "newsletter-creator": "newsletterCreator",
  "merch-design": "merchDesign",
  "bio-link-page": "bioLinkPage",
};

export class CreatorsAgentService {
  constructor(private readonly deps: CreatorsAgentServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  private get quality(): QualityPort {
    return this.deps.quality ?? agentQualityService;
  }

  async executeBySlug(slug: CreatorAgentSlug, userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    const method = AGENT_MAP[slug];
    if (!method) {
      throw new OsAgentError(`Unknown creator agent: ${String(slug)}`, "creator_agent");
    }
    return this[method](userId, params);
  }

  async videoMontage(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "video-montage", "creator", params, "Create a detailed video montage script with cuts, transitions, pacing, and scene rhythm.");
  }

  async thumbnail(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "thumbnail", "creator", params, "Create a high-CTR thumbnail concept including colors, text, composition, and focal hierarchy.");
  }

  async scriptWriter(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "script-writer", "creator", params, "Write a complete video script with hook intro, core development, and strong CTA ending.");
  }

  async multilingualSubtitles(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(
      userId,
      "multilingual-subtitles",
      "creator",
      params,
      "Generate subtitles in ES, EN, FR, DE, PT preserving meaning, timing clarity, and creator tone.",
    );
  }

  async viralClip(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "viral-clip", "creator", params, "Identify the top 3 viral moments from transcript/script and explain why each has viral potential.");
  }

  async youtubeSeO(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "youtube-seo", "creator", params, "Generate YouTube SEO package: title, description, tags, and chapter timestamps.");
  }

  async newsletterCreator(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "newsletter-creator", "creator", params, "Write a full newsletter with subject line, body sections, and conversion CTA.");
  }

  async merchDesign(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "merch-design", "creator", params, "Propose merch design concepts for t-shirt and hoodie with visual direction and style cues.");
  }

  async bioLinkPage(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runCreatorAgent(userId, "bio-link-page", "creator", params, "Create a complete bio-link page structure: links priority, sections, and conversion copy.");
  }

  private async runCreatorAgent(
    userId: string,
    serviceType: string,
    sector: string,
    params: Record<string, unknown>,
    taskInstruction: string,
  ): Promise<AgentResult> {
    const basePrompt = `${taskInstruction}\nReturn practical and specific output for this creator task.`;
    const prompt = await this.quality.buildEnhancedPrompt(basePrompt, serviceType, sector, params);
    const output = await this.llm.complete(prompt, {
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 2000,
    });
    const validation = await this.quality.validateOutput(output, serviceType, sector);
    if (!validation.valid) {
      throw new OsAgentError(`Invalid creator output: ${validation.issues.join("; ")}`, "creator_validation");
    }

    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO os_results (user_id, service_type, output, metadata, created_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       RETURNING id`,
      [userId, serviceType, output, JSON.stringify({ validation, params })],
    );

    return {
      success: true,
      output,
      metadata: {
        resultId: rows[0]?.id ?? null,
        serviceType,
        validationScore: validation.score,
      },
    };
  }
}

export const creatorsAgentService = new CreatorsAgentService();
