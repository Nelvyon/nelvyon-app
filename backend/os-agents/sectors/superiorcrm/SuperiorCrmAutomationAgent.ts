import type { ILlmClient } from "../../LlmClient";
import type { SuperiorCrmInput, SuperiorCrmOutput } from "./shared";
import { getDefaultSuperiorCrmLlm, runSuperiorCrmAgentCore } from "./shared";

const AGENT_ID = "superiorcrm-automation";

export class SuperiorCrmAutomationAgent {
  private static inst: SuperiorCrmAutomationAgent | undefined;

  static get instance(): SuperiorCrmAutomationAgent {
    if (!SuperiorCrmAutomationAgent.inst) SuperiorCrmAutomationAgent.inst = new SuperiorCrmAutomationAgent();
    return SuperiorCrmAutomationAgent.inst;
  }

  static reset(): void {
    SuperiorCrmAutomationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorCrmLlm();
  }

  async run(input: SuperiorCrmInput): Promise<SuperiorCrmOutput> {
    const eliteRole = "Eres **SuperiorCrm Automation Architect** — workflows y nurturing.";
    const mission =
      "Diseña **workflows CRM automáticos**, **triggers por comportamiento** y **secuencias de nurturing**.";
    const fewShot =
      '{"content":"Behavior triggers + nurture sequences mapped","score":87,"highlights":["Workflow triggers","Nurture"],"metrics":["Automations"]}';
    return runSuperiorCrmAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorCrmAutomationAgent(): SuperiorCrmAutomationAgent {
  return SuperiorCrmAutomationAgent.instance;
}

export function resetSuperiorCrmAutomationAgentForTests(): void {
  SuperiorCrmAutomationAgent.reset();
}
