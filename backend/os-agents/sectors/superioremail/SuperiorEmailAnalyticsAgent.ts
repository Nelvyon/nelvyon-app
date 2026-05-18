import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-analytics";

export class SuperiorEmailAnalyticsAgent {
  private static inst: SuperiorEmailAnalyticsAgent | undefined;

  static get instance(): SuperiorEmailAnalyticsAgent {
    if (!SuperiorEmailAnalyticsAgent.inst) SuperiorEmailAnalyticsAgent.inst = new SuperiorEmailAnalyticsAgent();
    return SuperiorEmailAnalyticsAgent.inst;
  }

  static reset(): void {
    SuperiorEmailAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Revenue Analyst** — atribución exacta por email y flujo.";
    const mission =
      "Reporta **atribución real**: revenue por email, **LTV por flujo**, **ROI exacto**; supera reporting agregado de competidores.";
    const fewShot =
      '{"content":"Revenue per email, LTV by flow, ROI 6.2x","score":90,"highlights":["Exact revenue attr","LTV by flow"],"metrics":["Email ROI"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorEmailAnalyticsAgent(): SuperiorEmailAnalyticsAgent {
  return SuperiorEmailAnalyticsAgent.instance;
}

export function resetSuperiorEmailAnalyticsAgentForTests(): void {
  SuperiorEmailAnalyticsAgent.reset();
}
