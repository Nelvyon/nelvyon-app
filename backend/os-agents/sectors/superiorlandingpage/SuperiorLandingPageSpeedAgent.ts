import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-speed";

export class SuperiorLandingPageSpeedAgent {
  private static inst: SuperiorLandingPageSpeedAgent | undefined;

  static get instance(): SuperiorLandingPageSpeedAgent {
    if (!SuperiorLandingPageSpeedAgent.inst) SuperiorLandingPageSpeedAgent.inst = new SuperiorLandingPageSpeedAgent();
    return SuperiorLandingPageSpeedAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageSpeedAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage Speed** — Core Web Vitals.";
    const mission =
      "Optimiza **Core Web Vitals**: **LCP <1s**, **CLS <0.05**, **INP <100ms** obligatorios.";
    const fewShot =
      '{"content":"Core Web Vitals LCP <1s CLS <0.05 INP <100ms optimization","score":92,"highlights":["LCP <1s","CLS <0.05"],"metrics":["CWV compliance"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorLandingPageSpeedAgent(): SuperiorLandingPageSpeedAgent {
  return SuperiorLandingPageSpeedAgent.instance;
}

export function resetSuperiorLandingPageSpeedAgentForTests(): void {
  SuperiorLandingPageSpeedAgent.reset();
}
