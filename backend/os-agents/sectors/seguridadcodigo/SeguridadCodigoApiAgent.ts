import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-api";

let inst: SeguridadCodigoApiAgent | null = null;

export class SeguridadCodigoApiAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoApiAgent {
    if (!inst) inst = new SeguridadCodigoApiAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código APIs** — superficie y abuso.";
    const mission =
      "Propón **protección de APIs** y **rate limiting inteligente** (cuotas por identidad, burst, circuit breaker, WAF/API gateway).";
    const fewShot =
      '{"result":"Capas API + rate adaptive","score":90,"recommendations":["mTLS interno","429 con Retry-After","Shadow ban por IP+device"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoApiAgent(): SeguridadCodigoApiAgent {
  return SeguridadCodigoApiAgent.instance();
}

export function resetSeguridadCodigoApiAgentForTests(): void {
  inst = null;
}
