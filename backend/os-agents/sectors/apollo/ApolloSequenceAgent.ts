import type { ILlmClient } from "../../LlmClient";
import type { ApolloInput, ApolloOutput } from "./shared";
import { getDefaultApolloLlm, runApolloAgentCore } from "./shared";

const AGENT_ID = "apollo-sequence";

export class ApolloSequenceAgent {
  private static inst: ApolloSequenceAgent | undefined;

  static get instance(): ApolloSequenceAgent {
    if (!ApolloSequenceAgent.inst) ApolloSequenceAgent.inst = new ApolloSequenceAgent();
    return ApolloSequenceAgent.inst;
  }

  static reset(): void {
    ApolloSequenceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultApolloLlm();
  }

  async run(input: ApolloInput): Promise<ApolloOutput> {
    const eliteRole =
      "Eres **Apollo.io Sequence Architect** — secuencias multicanal automatizadas con cadencia y guardrails de compliance.";
    const mission =
      "Genera **secuencia outreach 5 pasos**: **email D1**, **LinkedIn D3**, **email D5**, **llamada D8**, **email D12**; objetivos **reply rate >8%** y **meeting booked >2%**.";
    const fewShot =
      '{"content":"5-step multichannel D1/D3/D5/D8/D12 with reply>8% target","score":93,"highlights":["Email D1","Call D8"],"metrics":["Reply rate"]}';
    return runApolloAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getApolloSequenceAgent(): ApolloSequenceAgent {
  return ApolloSequenceAgent.instance;
}

export function resetApolloSequenceAgentForTests(): void {
  ApolloSequenceAgent.reset();
}
