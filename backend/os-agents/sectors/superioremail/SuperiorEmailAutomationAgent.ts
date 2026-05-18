import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-automation";

export class SuperiorEmailAutomationAgent {
  private static inst: SuperiorEmailAutomationAgent | undefined;

  static get instance(): SuperiorEmailAutomationAgent {
    if (!SuperiorEmailAutomationAgent.inst) SuperiorEmailAutomationAgent.inst = new SuperiorEmailAutomationAgent();
    return SuperiorEmailAutomationAgent.inst;
  }

  static reset(): void {
    SuperiorEmailAutomationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Automation Architect** — flujos 50+ nodos.";
    const mission =
      "Diseña **flujos automáticos 50+ nodos** (vs Klaviyo ~20): ramas, delays, splits comportamentales y revenue triggers.";
    const fewShot =
      '{"content":"Flow graph 52 nodes: browse, cart, winback, VIP","score":91,"highlights":["50+ nodes","Unlimited automation"],"metrics":["Flow nodes"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorEmailAutomationAgent(): SuperiorEmailAutomationAgent {
  return SuperiorEmailAutomationAgent.instance;
}

export function resetSuperiorEmailAutomationAgentForTests(): void {
  SuperiorEmailAutomationAgent.reset();
}
