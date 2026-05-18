import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-benchmark";

let inst: VoiceV8BenchmarkAgent | null = null;

export class VoiceV8BenchmarkAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8BenchmarkAgent {
    if (!inst) inst = new VoiceV8BenchmarkAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Benchmark** — sector y tamaño.";
    const mission =
      "Define **benchmarking por sector** con percentiles anonimizados y cohortes mínimas para privacidad.";
    const fewShot =
      '{"result":"Panel vs p50 sector","score":86,"recommendations":["k-anonimity","Bootstrap CI","Excluir outliers"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8BenchmarkAgent(): VoiceV8BenchmarkAgent {
  return VoiceV8BenchmarkAgent.instance();
}

export function resetVoiceV8BenchmarkAgentForTests(): void {
  inst = null;
}
