import type { ILlmClient } from "../../LlmClient";
import type { IntegracionesNativasInput, IntegracionesNativasOutput } from "./shared";
import { getDefaultIntegracionesNativasLlm, runIntegracionesNativasAgentCore } from "./shared";

const AGENT_ID = "integracionesnativas-ga4";

export class IntegracionesNativasGA4Agent {
  private static inst: IntegracionesNativasGA4Agent | undefined;

  static get instance(): IntegracionesNativasGA4Agent {
    if (!IntegracionesNativasGA4Agent.inst) IntegracionesNativasGA4Agent.inst = new IntegracionesNativasGA4Agent();
    return IntegracionesNativasGA4Agent.inst;
  }

  static reset(): void {
    IntegracionesNativasGA4Agent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIntegracionesNativasLlm();
  }

  async run(input: IntegracionesNativasInput): Promise<IntegracionesNativasOutput> {
    const eliteRole = "Eres **IntegracionesNativas GA4** — sync bidireccional con Google Analytics 4.";
    const mission =
      "Sincroniza **eventos**, **conversiones**, **audiencias** y **atribución** GA4; sync RT **<30s** sin pérdida de eventos.";
    const fewShot =
      '{"content":"GA4 bidireccional: eventos, conversiones, audiencias, atribución, <30s","score":93,"highlights":["Bidireccional","Atribución"],"metrics":["GA4 sync latency"]}';
    return runIntegracionesNativasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getIntegracionesNativasGA4Agent(): IntegracionesNativasGA4Agent {
  return IntegracionesNativasGA4Agent.instance;
}

export function resetIntegracionesNativasGA4AgentForTests(): void {
  IntegracionesNativasGA4Agent.reset();
}
