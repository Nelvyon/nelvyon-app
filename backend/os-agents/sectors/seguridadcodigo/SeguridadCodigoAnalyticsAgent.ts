import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-analytics";

let inst: SeguridadCodigoAnalyticsAgent | null = null;

export class SeguridadCodigoAnalyticsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoAnalyticsAgent {
    if (!inst) inst = new SeguridadCodigoAnalyticsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Analytics** — amenazas e intrusiones.";
    const mission =
      "Diseña **analytics de amenazas** e **intentos de intrusión** (correlación, alertas, playbooks de respuesta, retención mínima).";
    const fewShot =
      '{"result":"Tablero intentos sospechosos","score":87,"recommendations":["UUID sesión","Score riesgo","Enriquecimiento geo acotado"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoAnalyticsAgent(): SeguridadCodigoAnalyticsAgent {
  return SeguridadCodigoAnalyticsAgent.instance();
}

export function resetSeguridadCodigoAnalyticsAgentForTests(): void {
  inst = null;
}
