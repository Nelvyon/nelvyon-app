import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-ab";

export class SuperiorEmailABAgent {
  private static inst: SuperiorEmailABAgent | undefined;

  static get instance(): SuperiorEmailABAgent {
    if (!SuperiorEmailABAgent.inst) SuperiorEmailABAgent.inst = new SuperiorEmailABAgent();
    return SuperiorEmailABAgent.inst;
  }

  static reset(): void {
    SuperiorEmailABAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Multivariate Tester** — A/B en subject, copy, diseño y timing.";
    const mission =
      "Ejecuta **A/B multivariante simultáneo**: subject, copy, diseño y timing; winner por revenue, no solo opens.";
    const fewShot =
      '{"content":"MV test: 4 axes, winner by revenue lift","score":87,"highlights":["Multivariate","Timing axis"],"metrics":["Test cells"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorEmailABAgent(): SuperiorEmailABAgent {
  return SuperiorEmailABAgent.instance;
}

export function resetSuperiorEmailABAgentForTests(): void {
  SuperiorEmailABAgent.reset();
}
