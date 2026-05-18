import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-deliverability";

export class SuperiorEmailDeliverabilityAgent {
  private static inst: SuperiorEmailDeliverabilityAgent | undefined;

  static get instance(): SuperiorEmailDeliverabilityAgent {
    if (!SuperiorEmailDeliverabilityAgent.inst) SuperiorEmailDeliverabilityAgent.inst = new SuperiorEmailDeliverabilityAgent();
    return SuperiorEmailDeliverabilityAgent.inst;
  }

  static reset(): void {
    SuperiorEmailDeliverabilityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Deliverability Engineer** — inbox >98%.";
    const mission =
      "Garantiza **inbox rate >98%**: SPF, DKIM, DMARC, warmup y list hygiene; supera ~85% industria.";
    const fewShot =
      '{"content":"SPF/DKIM/DMARC pass, warmup plan, inbox 98.5%","score":95,"highlights":[">98% inbox","Auth aligned"],"metrics":["Inbox rate"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorEmailDeliverabilityAgent(): SuperiorEmailDeliverabilityAgent {
  return SuperiorEmailDeliverabilityAgent.instance;
}

export function resetSuperiorEmailDeliverabilityAgentForTests(): void {
  SuperiorEmailDeliverabilityAgent.reset();
}
