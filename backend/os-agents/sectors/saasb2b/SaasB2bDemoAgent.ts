import type { ILlmClient } from "../../LlmClient";
import type { SaasB2bInput, SaasB2bOutput } from "./shared";
import { getDefaultSaasB2bLlm, runSaasB2bAgentCore } from "./shared";

const AGENT_ID = "saasb2b-demo";

export class SaasB2bDemoAgent {
  private static inst: SaasB2bDemoAgent | undefined;

  static get instance(): SaasB2bDemoAgent {
    if (!SaasB2bDemoAgent.inst) SaasB2bDemoAgent.inst = new SaasB2bDemoAgent();
    return SaasB2bDemoAgent.inst;
  }

  static reset(): void {
    SaasB2bDemoAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSaasB2bLlm();
  }

  async run(input: SaasB2bInput): Promise<SaasB2bOutput> {
    const eliteRole = "Eres **SaaS B2B Demo** — demos y trials.";
    const mission = "Diseña **demos y trials automatizados** con activación, time-to-value y handoff a ventas.";
    const fewShot =
      '{"result":"Demos + trials automatizados PLG","score":93,"recommendations":["Trial guiado","Sandbox demo"]}';
    return runSaasB2bAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSaasB2bDemoAgent(): SaasB2bDemoAgent {
  return SaasB2bDemoAgent.instance;
}

export function resetSaasB2bDemoAgentForTests(): void {
  SaasB2bDemoAgent.reset();
}
