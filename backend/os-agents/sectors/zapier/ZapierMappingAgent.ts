import type { ILlmClient } from "../../LlmClient";
import type { ZapierInput, ZapierOutput } from "./shared";
import { getDefaultZapierLlm, runZapierAgentCore } from "./shared";

const AGENT_ID = "zapier-mapping";

export class ZapierMappingAgent {
  private static inst: ZapierMappingAgent | undefined;

  static get instance(): ZapierMappingAgent {
    if (!ZapierMappingAgent.inst) ZapierMappingAgent.inst = new ZapierMappingAgent();
    return ZapierMappingAgent.inst;
  }

  static reset(): void {
    ZapierMappingAgent.inst = undefined;
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
        eliteRole: "ROLE: Field mapper bidireccional; tipos y null safety.",
        mission:
          "Mapea campos **NELVYON ↔ Zapier/Make** automáticamente; transformaciones fecha/moneda/string; plantillas por sector.",
        fewShotExample:
          '{"content":"client.email → email_address (Make).","score":88,"highlights":["Schema diff","Defaults"],"metrics":["Map version"]}',
      },
      input,
      0.2,
    );
  }
}

export function getZapierMappingAgent(): ZapierMappingAgent {
  return ZapierMappingAgent.instance;
}

export function resetZapierMappingAgentForTests(): void {
  ZapierMappingAgent.reset();
}
