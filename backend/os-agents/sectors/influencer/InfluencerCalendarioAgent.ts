import type { ILlmClient } from "../../LlmClient";
import type { InfluencerInput, InfluencerOutput } from "./shared";
import { getDefaultInfluencerLlm, runInfluencerAgentCore } from "./shared";

const AGENT_ID = "influencer-calendario";

let inst: InfluencerCalendarioAgent | null = null;

export class InfluencerCalendarioAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): InfluencerCalendarioAgent {
    if (!inst) inst = new InfluencerCalendarioAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerLlm();
  }

  async run(input: InfluencerInput): Promise<InfluencerOutput> {
    const eliteRole = "Eres **Influencer Calendario** — editorial automático.";
    const mission =
      "Construye **calendario** (pilares, repurposing, picos, buffer crisis, sync campañas marca).";
    const fewShot =
      '{"result":"Calendario 30d + KPIs semanales","score":88,"recommendations":["Batch film days","Trend slots","Rest days"]}';
    return runInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getInfluencerCalendarioAgent(): InfluencerCalendarioAgent {
  return InfluencerCalendarioAgent.instance();
}

export function resetInfluencerCalendarioAgentForTests(): void {
  inst = null;
}
