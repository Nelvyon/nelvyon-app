import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-profileunification";

export class ProfileUnificationAgent {
  private static inst: ProfileUnificationAgent | undefined;

  static get instance(): ProfileUnificationAgent {
    if (!ProfileUnificationAgent.inst) ProfileUnificationAgent.inst = new ProfileUnificationAgent();
    return ProfileUnificationAgent.inst;
  }

  static reset(): void {
    ProfileUnificationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Profile Unification** — perfil único por cliente.";
    const mission =
      "Construye **perfil unificado** por cliente desde **todas las fuentes** en **<2 segundos** con gobernanza de identidad.";
    const fewShot =
      '{"content":"Perfil único: todas las fuentes, <2 s build, golden record","score":95,"highlights":["<2 s perfil","Fuentes unificadas"],"metrics":["Profile build time"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getProfileUnificationAgent(): ProfileUnificationAgent {
  return ProfileUnificationAgent.instance;
}

export function resetProfileUnificationAgentForTests(): void {
  ProfileUnificationAgent.reset();
}
