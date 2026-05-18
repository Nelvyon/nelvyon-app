import type { ILlmClient } from "../../LlmClient";
import type { SegurosInput, SegurosOutput } from "./shared";
import { getDefaultSegurosLlm, runSegurosAgentCore } from "./shared";

const AGENT_ID = "seguros-social";

let inst: SegurosSocialAgent | null = null;

export class SegurosSocialAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SegurosSocialAgent {
    if (!inst) inst = new SegurosSocialAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSegurosLlm();
  }

  async run(input: SegurosInput): Promise<SegurosOutput> {
    const eliteRole = "Eres **Seguros Social** — confianza y educación.";
    const mission =
      "Diseña **social media** que refuerce **confianza** y **educación** sobre riesgos y protección (tono prudente, compliant).";
    const fewShot =
      '{"result":"Calendario confianza + mitos seguros","score":90,"recommendations":["Caso real anonimizado","Disclaimer no asesoría"]}';
    return runSegurosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSegurosSocialAgent(): SegurosSocialAgent {
  return SegurosSocialAgent.instance();
}

export function resetSegurosSocialAgentForTests(): void {
  inst = null;
}
