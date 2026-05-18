import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSocialMediaInput, SuperiorSocialMediaOutput } from "./shared";
import { getDefaultSuperiorSocialMediaLlm, runSuperiorSocialMediaAgentCore } from "./shared";

const AGENT_ID = "superiorsocialmedia-scheduler";

export class SuperiorSocialMediaSchedulerAgent {
  private static inst: SuperiorSocialMediaSchedulerAgent | undefined;

  static get instance(): SuperiorSocialMediaSchedulerAgent {
    if (!SuperiorSocialMediaSchedulerAgent.inst) {
      SuperiorSocialMediaSchedulerAgent.inst = new SuperiorSocialMediaSchedulerAgent();
    }
    return SuperiorSocialMediaSchedulerAgent.inst;
  }

  static reset(): void {
    SuperiorSocialMediaSchedulerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSocialMediaLlm();
  }

  async run(input: SuperiorSocialMediaInput): Promise<SuperiorSocialMediaOutput> {
    const eliteRole =
      "Eres **SuperiorSocialMedia Scheduler** — timing y cadencia óptimos.";
    const mission =
      "Optimiza **timing por plataforma y audiencia** y **frecuencia de publicación** para maximizar alcance orgánico.";
    const fewShot =
      '{"content":"Per-platform slots + weekly frequency map","score":88,"highlights":["Optimal slots","Cadence"],"metrics":["Posts per week"]}';
    return runSuperiorSocialMediaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorSocialMediaSchedulerAgent(): SuperiorSocialMediaSchedulerAgent {
  return SuperiorSocialMediaSchedulerAgent.instance;
}

export function resetSuperiorSocialMediaSchedulerAgentForTests(): void {
  SuperiorSocialMediaSchedulerAgent.reset();
}
