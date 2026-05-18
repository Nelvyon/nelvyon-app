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

export type AdvancedAgentSlug =
  | "ecommerce"
  | "chatbot"
  | "presentation"
  | "business-plan"
  | "podcast"
  | "app-landing"
  | "recruiting"
  | "translation"
  | "competitive-analysis"
  | "google-my-business"
  | "lead-generation"
  | "commercial-proposal"
  | "press-kit"
  | "naming";

type AdvancedAgentMethodName =
  | "ecommerce"
  | "chatbot"
  | "presentation"
  | "businessPlan"
  | "podcast"
  | "appLanding"
  | "recruiting"
  | "translation"
  | "competitiveAnalysis"
  | "googleMyBusiness"
  | "leadGeneration"
  | "commercialProposal"
  | "pressKit"
  | "naming";

type QualityPort = Pick<AgentQualityService, "buildEnhancedPrompt" | "validateOutput">;

export type AdvancedAgentServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
  quality?: QualityPort;
};

const AGENT_MAP: Record<AdvancedAgentSlug, AdvancedAgentMethodName> = {
  ecommerce: "ecommerce",
  chatbot: "chatbot",
  presentation: "presentation",
  "business-plan": "businessPlan",
  podcast: "podcast",
  "app-landing": "appLanding",
  recruiting: "recruiting",
  translation: "translation",
  "competitive-analysis": "competitiveAnalysis",
  "google-my-business": "googleMyBusiness",
  "lead-generation": "leadGeneration",
  "commercial-proposal": "commercialProposal",
  "press-kit": "pressKit",
  naming: "naming",
};

export class AdvancedAgentService {
  constructor(private readonly deps: AdvancedAgentServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  private get quality(): QualityPort {
    return this.deps.quality ?? agentQualityService;
  }

  async executeBySlug(slug: AdvancedAgentSlug, userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    const method = AGENT_MAP[slug];
    if (!method) {
      throw new OsAgentError(`Unknown advanced agent: ${String(slug)}`, "advanced_agent");
    }
    return this[method](userId, params);
  }

  async ecommerce(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "ecommerce", "professional", params, "Create a full ecommerce strategy: product sheets, copy, and store structure.");
  }
  async chatbot(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "chatbot", "professional", params, "Create a complete conversational flow with responses, fallbacks, and human escalation paths.");
  }
  async presentation(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "presentation", "professional", params, "Design a professional presentation structure with slides, narrative arc, and key copy.");
  }
  async businessPlan(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "business-plan", "professional", params, "Write a complete business plan: executive summary, market, model, and financial perspective.");
  }
  async podcast(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "podcast", "professional", params, "Build a podcast script with intro, interview questions, transitions, and outro.");
  }
  async appLanding(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "app-landing", "professional", params, "Write complete app landing copy: hero, features, CTA blocks, and FAQ.");
  }
  async recruiting(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "recruiting", "professional", params, "Create a job offer, ideal candidate profile, and interview questions.");
  }
  async translation(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "translation", "professional", params, "Provide a professional translation adapted to context, tone, and sector language.");
  }
  async competitiveAnalysis(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "competitive-analysis", "professional", params, "Deliver a competitive analysis covering strengths, weaknesses, and opportunities.");
  }
  async googleMyBusiness(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "google-my-business", "professional", params, "Generate Google My Business assets: business description, post ideas, and review replies.");
  }
  async leadGeneration(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "lead-generation", "professional", params, "Build a lead-generation strategy with channels, messaging, and outbound sequences.");
  }
  async commercialProposal(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "commercial-proposal", "professional", params, "Create a professional commercial proposal including pricing, value, and CTA.");
  }
  async pressKit(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "press-kit", "professional", params, "Write a full press kit with bio, key facts, suggested photos, and media contact.");
  }
  async naming(userId: string, params: Record<string, unknown>): Promise<AgentResult> {
    return this.runAdvancedAgent(userId, "naming", "professional", params, "Generate 10 brand names including suggested domain, meaning, and score.");
  }

  private async runAdvancedAgent(
    userId: string,
    serviceType: string,
    sector: string,
    params: Record<string, unknown>,
    taskInstruction: string,
  ): Promise<AgentResult> {
    const basePrompt = `${taskInstruction}\nReturn practical and specific output for this advanced professional service task.`;
    const prompt = await this.quality.buildEnhancedPrompt(basePrompt, serviceType, sector, params);
    const output = await this.llm.complete(prompt, { model: "gpt-4o", temperature: 0.7, maxTokens: 2000 });
    const validation = await this.quality.validateOutput(output, serviceType, sector);
    if (!validation.valid) {
      throw new OsAgentError(`Invalid advanced output: ${validation.issues.join("; ")}`, "advanced_validation");
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

export const advancedAgentService = new AdvancedAgentService();
