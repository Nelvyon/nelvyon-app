import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-comunidad";

let inst: InfluencerComunidadAgent | null = null;

export class InfluencerComunidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerComunidadAgent {
    if (!inst) inst = new InfluencerComunidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Comunidad** — comentarios y DMs IA.";
    const mission =
      "Diseña **playbook comunidad** (macros respuesta, escalación humano, toxicidad, PII, horarios).";
    const fewShot =
      '{"result":"Árbol decisiones DM + 10 macros","score":86,"recommendations":["Sentiment triage","SLA 15m","Ban patterns"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerComunidadAgent(): InfluencerComunidadAgent {
  return InfluencerComunidadAgent.instance();
}

export function resetInfluencerComunidadAgentForTests(): void {
  inst = null;
}
