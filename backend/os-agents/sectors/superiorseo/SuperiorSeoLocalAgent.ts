import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-local";

export class SuperiorSeoLocalAgent {
  private static inst: SuperiorSeoLocalAgent | undefined;

  static get instance(): SuperiorSeoLocalAgent {
    if (!SuperiorSeoLocalAgent.inst) SuperiorSeoLocalAgent.inst = new SuperiorSeoLocalAgent();
    return SuperiorSeoLocalAgent.inst;
  }

  static reset(): void {
    SuperiorSeoLocalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Local Specialist** — GBP, NAP y reseñas.";
    const mission =
      "Optimiza **SEO local**: **Google Business Profile**, citas **NAP**, **reseñas** y **keywords geolocalizadas**.";
    const fewShot =
      '{"content":"GBP optimized, NAP citations, local keywords","score":87,"highlights":["GBP","NAP"],"metrics":["Local pack"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorSeoLocalAgent(): SuperiorSeoLocalAgent {
  return SuperiorSeoLocalAgent.instance;
}

export function resetSuperiorSeoLocalAgentForTests(): void {
  SuperiorSeoLocalAgent.reset();
}
