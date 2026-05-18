import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-emails";

let inst: AutoprocesosEmailsAgent | null = null;

export class AutoprocesosEmailsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosEmailsAgent {
    if (!inst) inst = new AutoprocesosEmailsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Emails** — seguimiento operativo.";
    const mission =
      "Automatiza **emails de seguimiento** internos/externos (disparadores, personalización segura, opt-out, logs).";
    const fewShot =
      '{"result":"Secuencia post-reunión ventas","score":89,"recommendations":["Un hilo por deal","Snooze","Plantillas legales"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosEmailsAgent(): AutoprocesosEmailsAgent {
  return AutoprocesosEmailsAgent.instance();
}

export function resetAutoprocesosEmailsAgentForTests(): void {
  inst = null;
}
