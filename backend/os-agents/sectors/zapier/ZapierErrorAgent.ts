import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-error";

export class ZapierErrorAgent {
  private static inst: ZapierErrorAgent | undefined;

  static get instance(): ZapierErrorAgent {
    if (!ZapierErrorAgent.inst) ZapierErrorAgent.inst = new ZapierErrorAgent();
    return ZapierErrorAgent.inst;
  }

  static reset(): void {
    ZapierErrorAgent.inst = undefined;
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
        eliteRole: "ROLE: Circuit breaker + notify; zaps rotos visibles.",
        mission:
          "Gestiona errores, **reintentos** con backoff y **alertas** cuando un zap/scenario falla de forma sostenida.",
        fewShotExample:
          '{"content":"5 fallos seguidos → email owner + disable temporario.","score":89,"highlights":["Retry","DLQ"],"metrics":["MTTR"]}',
      },
      input,
      0.1,
    );
  }
}

export function getZapierErrorAgent(): ZapierErrorAgent {
  return ZapierErrorAgent.instance;
}

export function resetZapierErrorAgentForTests(): void {
  ZapierErrorAgent.reset();
}
