import type { ILlmClient } from "../../LlmClient";
import type { SuperiorLeadEnrichmentInput, SuperiorLeadEnrichmentOutput } from "./shared";
import { getDefaultSuperiorLeadEnrichmentLlm, runSuperiorLeadEnrichmentAgentCore } from "./shared";

const AGENT_ID = "superiorleadenrichment-verification";

export class SuperiorLeadEnrichmentVerificationAgent {
  private static inst: SuperiorLeadEnrichmentVerificationAgent | undefined;

  static get instance(): SuperiorLeadEnrichmentVerificationAgent {
    if (!SuperiorLeadEnrichmentVerificationAgent.inst) {
      SuperiorLeadEnrichmentVerificationAgent.inst = new SuperiorLeadEnrichmentVerificationAgent();
    }
    return SuperiorLeadEnrichmentVerificationAgent.inst;
  }

  static reset(): void {
    SuperiorLeadEnrichmentVerificationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorLeadEnrichmentLlm();
  }

  async run(input: SuperiorLeadEnrichmentInput): Promise<SuperiorLeadEnrichmentOutput> {
    const eliteRole = "Eres **SuperiorLeadEnrichment Verification** — verificación en tiempo real.";
    const mission =
      "Verifica **emails y teléfonos** en tiempo real con bounce prediction **>98%** accuracy.";
    const fewShot =
      '{"content":"Real-time email phone verification bounce prediction >98%","score":92,"highlights":[">98% verification","Bounce prediction"],"metrics":["Verification accuracy"]}';
    return runSuperiorLeadEnrichmentAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorLeadEnrichmentVerificationAgent(): SuperiorLeadEnrichmentVerificationAgent {
  return SuperiorLeadEnrichmentVerificationAgent.instance;
}

export function resetSuperiorLeadEnrichmentVerificationAgentForTests(): void {
  SuperiorLeadEnrichmentVerificationAgent.reset();
}
