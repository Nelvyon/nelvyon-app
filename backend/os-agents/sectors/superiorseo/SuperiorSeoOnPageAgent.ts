import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-onpage";

export class SuperiorSeoOnPageAgent {
  private static inst: SuperiorSeoOnPageAgent | undefined;

  static get instance(): SuperiorSeoOnPageAgent {
    if (!SuperiorSeoOnPageAgent.inst) SuperiorSeoOnPageAgent.inst = new SuperiorSeoOnPageAgent();
    return SuperiorSeoOnPageAgent.inst;
  }

  static reset(): void {
    SuperiorSeoOnPageAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo On-Page Optimizer** — titles, schema y enlaces internos.";
    const mission =
      "Optimiza **on-page**: title, meta, **H1-H6**, **schema markup** e **internal linking**; CTR orgánico **>8%**.";
    const fewShot =
      '{"content":"Title/meta/H1 optimized, schema + internal links","score":88,"highlights":["Schema","Internal links"],"metrics":["CTR target"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorSeoOnPageAgent(): SuperiorSeoOnPageAgent {
  return SuperiorSeoOnPageAgent.instance;
}

export function resetSuperiorSeoOnPageAgentForTests(): void {
  SuperiorSeoOnPageAgent.reset();
}
