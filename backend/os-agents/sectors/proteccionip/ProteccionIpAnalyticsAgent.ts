import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-analytics";

let inst: ProteccionIpAnalyticsAgent | null = null;

export class ProteccionIpAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpAnalyticsAgent {
    if (!inst) inst = new ProteccionIpAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Analytics** — cartera y riesgos.";
    const mission =
      "Diseña **analytics del valor de la cartera IP** y **mapa de riesgos** (vencimientos, exposición, coste defensa).";
    const fewShot =
      '{"result":"Dashboard KPI marcas + patentes","score":92,"recommendations":["Coste por alerta","ROI registro"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpAnalyticsAgent(): ProteccionIpAnalyticsAgent {
  return ProteccionIpAnalyticsAgent.instance();
}

export function resetProteccionIpAnalyticsAgentForTests(): void {
  inst = null;
}
