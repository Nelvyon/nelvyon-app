import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-secrets";

let inst: ProteccionIpSecretsAgent | null = null;

export class ProteccionIpSecretsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpSecretsAgent {
    if (!inst) inst = new ProteccionIpSecretsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Secretos** — trade secrets y NDAs.";
    const mission =
      "Diseña **protección de secretos comerciales** y marco de **NDAs** (clasificación, acceso, incident response).";
    const fewShot =
      '{"result":"Matriz confidencialidad por rol","score":91,"recommendations":["Marcación documentos","Exit interview"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpSecretsAgent(): ProteccionIpSecretsAgent {
  return ProteccionIpSecretsAgent.instance();
}

export function resetProteccionIpSecretsAgentForTests(): void {
  inst = null;
}
