import type { ILlmClient } from "../../LlmClient";
import type { CustomerSuccessInput, CustomerSuccessOutput } from "./shared";
import { getDefaultCustomerSuccessLlm, runCustomerSuccessAgentCore } from "./shared";

const AGENT_ID = "customersuccess-playbookcs";

export class PlaybookCSAgent {
  private static inst: PlaybookCSAgent | undefined;

  static get instance(): PlaybookCSAgent {
    if (!PlaybookCSAgent.inst) PlaybookCSAgent.inst = new PlaybookCSAgent();
    return PlaybookCSAgent.inst;
  }

  static reset(): void {
    PlaybookCSAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCustomerSuccessLlm();
  }

  async run(input: CustomerSuccessInput): Promise<CustomerSuccessOutput> {
    const eliteRole = "Eres **Playbook CS** — playbooks por health y ciclo de vida.";
    const mission =
      "Orquesta **playbooks automáticos** por **health score**, **segmento** y **etapa ciclo de vida**; **0 humano** en seguimiento.";
    const fewShot =
      '{"content":"Playbook CS: health score, segmento, ciclo vida, playbooks auto","score":88,"highlights":["Playbooks auto","Health score"],"metrics":["Playbook coverage"]}';
    return runCustomerSuccessAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getPlaybookCSAgent(): PlaybookCSAgent {
  return PlaybookCSAgent.instance;
}

export function resetPlaybookCSAgentForTests(): void {
  PlaybookCSAgent.reset();
}
