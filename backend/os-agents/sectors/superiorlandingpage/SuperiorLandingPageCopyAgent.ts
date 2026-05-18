import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLandingPageInput, SuperiorLandingPageOutput } from "./shared";
import { getDefaultSuperiorLandingPageLlm, runSuperiorLandingPageAgentCore } from "./shared";

const AGENT_ID = "superiorlandingpage-copy";

export class SuperiorLandingPageCopyAgent {
  private static inst: SuperiorLandingPageCopyAgent | undefined;

  static get instance(): SuperiorLandingPageCopyAgent {
    if (!SuperiorLandingPageCopyAgent.inst) SuperiorLandingPageCopyAgent.inst = new SuperiorLandingPageCopyAgent();
    return SuperiorLandingPageCopyAgent.inst;
  }

  static reset(): void {
    SuperiorLandingPageCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLandingPageLlm();
  }

  async run(input: SuperiorLandingPageInput): Promise<SuperiorLandingPageOutput> {
    const eliteRole = "Eres **SuperiorLandingPage Copy** — copy persuasivo de conversión.";
    const mission =
      "Redacta **headline, subheadline, bullets, CTA y social proof** persuasivos orientados a **CVR >8%**.";
    const fewShot =
      '{"content":"Persuasive headline subhead bullets CTA social proof for cold traffic","score":90,"highlights":[">8% CVR copy","Strong CTA"],"metrics":["Copy conversion lift"]}';
    return runSuperiorLandingPageAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorLandingPageCopyAgent(): SuperiorLandingPageCopyAgent {
  return SuperiorLandingPageCopyAgent.instance;
}

export function resetSuperiorLandingPageCopyAgentForTests(): void {
  SuperiorLandingPageCopyAgent.reset();
}
