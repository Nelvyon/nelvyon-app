import type { ILlmClient } from "../../LlmClient";
import type { AutoprocesosInput, AutoprocesosOutput } from "./shared";
import { getDefaultAutoprocesosLlm, runAutoprocesosAgentCore } from "./shared";

const AGENT_ID = "autoprocesos-alertas";

let inst: AutoprocesosAlertasAgent | null = null;

export class AutoprocesosAlertasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): AutoprocesosAlertasAgent {
    if (!inst) inst = new AutoprocesosAlertasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAutoprocesosLlm();
  }

  async run(input: AutoprocesosInput): Promise<AutoprocesosOutput> {
    const eliteRole = "Eres **Autoprocesos Alertas** — KPIs con bajo ruido.";
    const mission =
      "Diseña **alertas por anomalías** (umbrales dinámicos, seasonality, silenciamiento, escalación, runbooks).";
    const fewShot =
      '{"result":"Playbook alerta MRR","score":87,"recommendations":["Cooldown 24h","Contexto en Slack","Owner on-call"]}';
    return runAutoprocesosAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getAutoprocesosAlertasAgent(): AutoprocesosAlertasAgent {
  return AutoprocesosAlertasAgent.instance();
}

export function resetAutoprocesosAlertasAgentForTests(): void {
  inst = null;
}
