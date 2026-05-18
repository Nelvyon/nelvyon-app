import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-monitoreo";

let inst: ProteccionIpMonitoreoAgent | null = null;

export class ProteccionIpMonitoreoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpMonitoreoAgent {
    if (!inst) inst = new ProteccionIpMonitoreoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Monitoreo** — alertas y scraping.";
    const mission =
      "Diseña **monitoreo de infracción** y **alertas automáticas** (marketplaces, repos, dominios typosquatting).";
    const fewShot =
      '{"result":"Playbook alerta P1 vs P3","score":92,"recommendations":["Fingerprint assets","RSS USPTO"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpMonitoreoAgent(): ProteccionIpMonitoreoAgent {
  return ProteccionIpMonitoreoAgent.instance();
}

export function resetProteccionIpMonitoreoAgentForTests(): void {
  inst = null;
}
