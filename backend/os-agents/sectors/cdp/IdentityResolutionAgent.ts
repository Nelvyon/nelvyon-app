import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-identityresolution";

export class IdentityResolutionAgent {
  private static inst: IdentityResolutionAgent | undefined;

  static get instance(): IdentityResolutionAgent {
    if (!IdentityResolutionAgent.inst) IdentityResolutionAgent.inst = new IdentityResolutionAgent();
    return IdentityResolutionAgent.inst;
  }

  static reset(): void {
    IdentityResolutionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Identity Resolution** — unificación de identidad cross-device y cross-canal.";
    const mission =
      "Unifica identidad **cross-device** y **cross-canal** con enfoque **determinista + probabilista** y **accuracy >95%**.";
    const fewShot =
      '{"content":"Identity resolution: cross-device/canal, determinista+probabilista, >95% accuracy","score":96,"highlights":[">95% accuracy","Cross-device"],"metrics":["Identity match rate"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getIdentityResolutionAgent(): IdentityResolutionAgent {
  return IdentityResolutionAgent.instance;
}

export function resetIdentityResolutionAgentForTests(): void {
  IdentityResolutionAgent.reset();
}
