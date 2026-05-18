import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-anomaly";

export class SuperiorAttributionAnomalyAgent {
  private static inst: SuperiorAttributionAnomalyAgent | undefined;

  static get instance(): SuperiorAttributionAnomalyAgent {
    if (!SuperiorAttributionAnomalyAgent.inst) SuperiorAttributionAnomalyAgent.inst = new SuperiorAttributionAnomalyAgent();
    return SuperiorAttributionAnomalyAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionAnomalyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Anomaly** — fraude y anomalías.";
    const mission =
      "Detecta **anomalías de atribución**, **fraude de clicks** y tráfico inválido con accuracy **>95%**.";
    const fewShot =
      '{"content":"Attribution anomalies click fraud invalid traffic detection >95% accuracy","score":93,"highlights":[">95% fraud detection","Invalid traffic"],"metrics":["Fraud accuracy"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorAttributionAnomalyAgent(): SuperiorAttributionAnomalyAgent {
  return SuperiorAttributionAnomalyAgent.instance;
}

export function resetSuperiorAttributionAnomalyAgentForTests(): void {
  SuperiorAttributionAnomalyAgent.reset();
}
