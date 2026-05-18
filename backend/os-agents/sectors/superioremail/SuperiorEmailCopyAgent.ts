import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-copy";

export class SuperiorEmailCopyAgent {
  private static inst: SuperiorEmailCopyAgent | undefined;

  static get instance(): SuperiorEmailCopyAgent {
    if (!SuperiorEmailCopyAgent.inst) SuperiorEmailCopyAgent.inst = new SuperiorEmailCopyAgent();
    return SuperiorEmailCopyAgent.inst;
  }

  static reset(): void {
    SuperiorEmailCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Copy Chief** — copy que rompe benchmarks de industria.";
    const mission =
      "Genera copy que supere benchmarks: **OR >45%**, **CTR >8%** (vs 21%/2.5% industria) con datos reales del cliente.";
    const fewShot =
      '{"content":"Subject + body: OR 48% CTR 9% vs industry 21/2.5","score":93,"highlights":[">45% OR",">8% CTR"],"metrics":["Projected OR"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorEmailCopyAgent(): SuperiorEmailCopyAgent {
  return SuperiorEmailCopyAgent.instance;
}

export function resetSuperiorEmailCopyAgentForTests(): void {
  SuperiorEmailCopyAgent.reset();
}
