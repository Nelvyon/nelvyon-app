import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-analytics";

let inst: ArteNftAnalyticsAgent | null = null;

export class ArteNftAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftAnalyticsAgent {
    if (!inst) inst = new ArteNftAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Analytics** — ventas y conversión.";
    const mission =
      "Diseña **analytics de ventas**, **seguidores** y **conversión** (funnels drop, AOV, retención lista).";
    const fewShot =
      '{"result":"Dashboard ventas + social lift","score":92,"recommendations":["Cohort por drop","CTR landing mint"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftAnalyticsAgent(): ArteNftAnalyticsAgent {
  return ArteNftAnalyticsAgent.instance();
}

export function resetArteNftAnalyticsAgentForTests(): void {
  inst = null;
}
