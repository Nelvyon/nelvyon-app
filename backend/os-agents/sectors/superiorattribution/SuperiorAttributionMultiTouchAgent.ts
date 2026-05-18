import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-multitouch";

export class SuperiorAttributionMultiTouchAgent {
  private static inst: SuperiorAttributionMultiTouchAgent | undefined;

  static get instance(): SuperiorAttributionMultiTouchAgent {
    if (!SuperiorAttributionMultiTouchAgent.inst) SuperiorAttributionMultiTouchAgent.inst = new SuperiorAttributionMultiTouchAgent();
    return SuperiorAttributionMultiTouchAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionMultiTouchAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution MultiTouch** — modelos multi-touch.";
    const mission =
      "Modela **first, last, linear, time-decay y data-driven**; actualización data-driven **cada 24h**; **100% conversiones** atribuidas.";
    const fewShot =
      '{"content":"Multi-touch first last linear time-decay data-driven 24h refresh 100% attributed","score":91,"highlights":["100% attributed","Data-driven 24h"],"metrics":["Attribution coverage"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorAttributionMultiTouchAgent(): SuperiorAttributionMultiTouchAgent {
  return SuperiorAttributionMultiTouchAgent.instance;
}

export function resetSuperiorAttributionMultiTouchAgentForTests(): void {
  SuperiorAttributionMultiTouchAgent.reset();
}
