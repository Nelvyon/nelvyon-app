import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-meta";

export class IntegracionesNativasMetaAgent {
  private static inst: IntegracionesNativasMetaAgent | undefined;

  static get instance(): IntegracionesNativasMetaAgent {
    if (!IntegracionesNativasMetaAgent.inst) IntegracionesNativasMetaAgent.inst = new IntegracionesNativasMetaAgent();
    return IntegracionesNativasMetaAgent.inst;
  }

  static reset(): void {
    IntegracionesNativasMetaAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas Meta** — integración nativa con Meta.";
    const mission =
      "Conecta **Pixel**, **CAPI**, **audiencias custom** y **catálogo de productos**; dedupe automático de eventos.";
    const fewShot =
      '{"content":"Meta nativo: Pixel, CAPI, audiencias custom, catálogo productos","score":92,"highlights":["CAPI","Catálogo"],"metrics":["Meta event match"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getIntegracionesNativasMetaAgent(): IntegracionesNativasMetaAgent {
  return IntegracionesNativasMetaAgent.instance;
}

export function resetIntegracionesNativasMetaAgentForTests(): void {
  IntegracionesNativasMetaAgent.reset();
}
