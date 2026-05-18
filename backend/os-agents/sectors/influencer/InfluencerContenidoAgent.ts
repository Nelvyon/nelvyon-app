import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-contenido";

let inst: InfluencerContenidoAgent | null = null;

export class InfluencerContenidoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerContenidoAgent {
    if (!inst) inst = new InfluencerContenidoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Contenido** — multi-red nativo.";
    const mission =
      "Planifica **contenido automático** IG/TikTok/YouTube/X (hooks, formatos, hashtags, compliance plataforma).";
    const fewShot =
      '{"result":"Matriz 14 días cross-post","score":89,"recommendations":["Safe zone 9:16","Series vs one-off","UGC prompts"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerContenidoAgent(): InfluencerContenidoAgent {
  return InfluencerContenidoAgent.instance();
}

export function resetInfluencerContenidoAgentForTests(): void {
  inst = null;
}
