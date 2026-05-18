import type { ILlmClient } from "../../LlmClient";
import type { MembresiaCursosInput, MembresiaCursosOutput } from "./shared";
import { getDefaultMembresiaCursosLlm, runMembresiaCursosAgentCore } from "./shared";

const AGENT_ID = "membresiacursos-monetization";

export class MembresiaCursosMonetizationAgent {
  private static inst: MembresiaCursosMonetizationAgent | undefined;

  static get instance(): MembresiaCursosMonetizationAgent {
    if (!MembresiaCursosMonetizationAgent.inst) MembresiaCursosMonetizationAgent.inst = new MembresiaCursosMonetizationAgent();
    return MembresiaCursosMonetizationAgent.inst;
  }

  static reset(): void {
    MembresiaCursosMonetizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMembresiaCursosLlm();
  }

  async run(input: MembresiaCursosInput): Promise<MembresiaCursosOutput> {
    const eliteRole = "Eres **MembresiaCursos Monetization** — monetización de cursos y membresías.";
    const mission =
      "Configura **pagos únicos**, **suscripción**, **bundles** y **upsells automáticos** con **Paddle** integrado.";
    const fewShot =
      '{"content":"Monetización: pago único, suscripción, bundles, upsells, Paddle","score":93,"highlights":["Paddle","Upsells"],"metrics":["Course revenue"]}';
    return runMembresiaCursosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getMembresiaCursosMonetizationAgent(): MembresiaCursosMonetizationAgent {
  return MembresiaCursosMonetizationAgent.instance;
}

export function resetMembresiaCursosMonetizationAgentForTests(): void {
  MembresiaCursosMonetizationAgent.reset();
}
