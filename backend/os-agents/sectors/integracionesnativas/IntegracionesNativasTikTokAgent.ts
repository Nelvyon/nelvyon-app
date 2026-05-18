import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-tiktok";

export class IntegracionesNativasTikTokAgent {
  private static inst: IntegracionesNativasTikTokAgent | undefined;

  static get instance(): IntegracionesNativasTikTokAgent {
    if (!IntegracionesNativasTikTokAgent.inst) IntegracionesNativasTikTokAgent.inst = new IntegracionesNativasTikTokAgent();
    return IntegracionesNativasTikTokAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasTikTokAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas TikTok** — integración nativa con TikTok Ads.";
    const mission =
      "Conecta **pixel**, **eventos**, **audiencias** y **catálogo** TikTok; dedupe cross-plataforma automático.";
    const fewShot =
      '{"content":"TikTok Ads: pixel, eventos, audiencias, catálogo","score":90,"highlights":["Pixel","Catálogo"],"metrics":["TikTok event match"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getIntegracionesNativasTikTokAgent(): IntegracionesNativasTikTokAgent {
  return IntegracionesNativasTikTokAgent.instance;
}

export function resetIntegracionesNativasTikTokAgentForTests(): void {
  IntegracionesNativasTikTokAgent.reset();
}
