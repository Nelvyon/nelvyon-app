import type { ILlmClient } from "../../LlmClient";
import type { SuperiorChurnInput, SuperiorChurnOutput } from "./shared";
import { getDefaultSuperiorChurnLlm, runSuperiorChurnAgentCore } from "./shared";

const AGENT_ID = "superiorchurn-playbook";

export class SuperiorChurnPlaybookAgent {
  private static inst: SuperiorChurnPlaybookAgent | undefined;

  static get instance(): SuperiorChurnPlaybookAgent {
    if (!SuperiorChurnPlaybookAgent.inst) SuperiorChurnPlaybookAgent.inst = new SuperiorChurnPlaybookAgent();
    return SuperiorChurnPlaybookAgent.inst;
  }

  static reset(): void {
    SuperiorChurnPlaybookAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorChurnLlm();
  }

  async run(input: SuperiorChurnInput): Promise<SuperiorChurnOutput> {
    const eliteRole = "Eres **SuperiorChurn Retention Playbook Designer** — acciones por segmento.";
    const mission =
      "Playbooks de **retención por segmento**, **acciones automáticas** y **ofertas personalizadas**; churn **-40%** vs baseline.";
    const fewShot =
      '{"content":"Segment playbooks + auto actions + personalized offers","score":89,"highlights":["-40% churn","Auto actions"],"metrics":["Retention lift"]}';
    return runSuperiorChurnAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorChurnPlaybookAgent(): SuperiorChurnPlaybookAgent {
  return SuperiorChurnPlaybookAgent.instance;
}

export function resetSuperiorChurnPlaybookAgentForTests(): void {
  SuperiorChurnPlaybookAgent.reset();
}
