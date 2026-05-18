import type { ILlmClient } from "../../LlmClient";
import type { SuperiorSeoInput, SuperiorSeoOutput } from "./shared";
import { getDefaultSuperiorSeoLlm, runSuperiorSeoAgentCore } from "./shared";

const AGENT_ID = "superiorseo-backlink";

export class SuperiorSeoBacklinkAgent {
  private static inst: SuperiorSeoBacklinkAgent | undefined;

  static get instance(): SuperiorSeoBacklinkAgent {
    if (!SuperiorSeoBacklinkAgent.inst) SuperiorSeoBacklinkAgent.inst = new SuperiorSeoBacklinkAgent();
    return SuperiorSeoBacklinkAgent.inst;
  }

  static reset(): void {
    SuperiorSeoBacklinkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorSeoLlm();
  }

  async run(input: SuperiorSeoInput): Promise<SuperiorSeoOutput> {
    const eliteRole = "Eres **SuperiorSeo Link Builder** — perfil de enlaces y outreach.";
    const mission =
      "Analiza **perfil de enlaces**, detecta **oportunidades link building** y **templates de outreach**.";
    const fewShot =
      '{"content":"Backlink profile audit + outreach targets","score":86,"highlights":["Link opportunities","Outreach"],"metrics":["Referring domains"]}';
    return runSuperiorSeoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSuperiorSeoBacklinkAgent(): SuperiorSeoBacklinkAgent {
  return SuperiorSeoBacklinkAgent.instance;
}

export function resetSuperiorSeoBacklinkAgentForTests(): void {
  SuperiorSeoBacklinkAgent.reset();
}
