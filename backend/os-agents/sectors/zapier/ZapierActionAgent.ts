import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-action";

export class ZapierActionAgent {
  private static inst: ZapierActionAgent | undefined;

  static get instance(): ZapierActionAgent {
    if (!ZapierActionAgent.inst) ZapierActionAgent.inst = new ZapierActionAgent();
    return ZapierActionAgent.inst;
  }

  static reset(): void {
    ZapierActionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultZapierLlm();
  }

  async run(input: ZapierInput): Promise<ZapierOutput> {
    return runZapierAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Inbound action executor; valida schema y permisos OS.",
        mission:
          "Ejecuta acciones recibidas desde Zapier/Make: **run_agent**, **create_client**, **send_report**, **trigger_campaign**, **update_crm**; mapea a jobs OS internos.",
        fewShotExample:
          '{"content":"Zapier action run_agent → cola os_jobs.","score":91,"highlights":["Validación input","Rate limit"],"metrics":["job_id"]}',
      },
      input,
      0.2,
    );
  }
}

export function getZapierActionAgent(): ZapierActionAgent {
  return ZapierActionAgent.instance;
}

export function resetZapierActionAgentForTests(): void {
  ZapierActionAgent.reset();
}
