import type { ILlmClient } from "../../LlmClient";
import type { PerfPredictorInput, PerfPredictorOutput } from "./shared";
import { getDefaultPerfPredictorLlm, runPerfPredictorAgentCore } from "./shared";

const AGENT_ID = "perfpredictor-channel";

export class PerfPredictorChannelAgent {
  private static inst: PerfPredictorChannelAgent | undefined;

  static get instance(): PerfPredictorChannelAgent {
    if (!PerfPredictorChannelAgent.inst) PerfPredictorChannelAgent.inst = new PerfPredictorChannelAgent();
    return PerfPredictorChannelAgent.inst;
  }

  static reset(): void {
    PerfPredictorChannelAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPerfPredictorLlm();
  }

  async run(input: PerfPredictorInput): Promise<PerfPredictorOutput> {
    const eliteRole =
      "Eres **PerfPredictor Channel Comparator** — rendimiento predicho por canal.";
    const mission =
      "Compara rendimiento predicho por **Meta**, **Google**, **Email**, **SEO**; CTR, conversiones y ROAS con intervalos base.";
    const fewShot =
      '{"content":"Meta vs Google vs Email vs SEO predicted ROAS","score":91,"highlights":["Meta","SEO"],"metrics":["Channel ROAS"]}';
    return runPerfPredictorAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getPerfPredictorChannelAgent(): PerfPredictorChannelAgent {
  return PerfPredictorChannelAgent.instance;
}

export function resetPerfPredictorChannelAgentForTests(): void {
  PerfPredictorChannelAgent.reset();
}
