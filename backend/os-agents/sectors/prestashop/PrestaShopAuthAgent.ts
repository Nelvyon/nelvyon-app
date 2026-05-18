import type { ILlmClient } from "../../LlmClient";
import type { PrestaShopInput, PrestaShopOutput } from "./shared";
import { getDefaultPrestaShopLlm, runPrestaShopAgentCore } from "./shared";

const AGENT_ID = "prestashop-auth";

export class PrestaShopAuthAgent {
  private static inst: PrestaShopAuthAgent | undefined;

  static get instance(): PrestaShopAuthAgent {
    if (!PrestaShopAuthAgent.inst) PrestaShopAuthAgent.inst = new PrestaShopAuthAgent();
    return PrestaShopAuthAgent.inst;
  }

  static reset(): void {
    PrestaShopAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPrestaShopLlm();
  }

  async run(input: PrestaShopInput): Promise<PrestaShopOutput> {
    return runPrestaShopAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "Eres **PrestaShop WebService Security Architect** — API Key con prefijo **PrestaShop**, vault y rotación.",
        mission:
          "Redacta **plan de autenticación WebService**: creación/revocación de keys, permisos read/write mínimos, HTTPS y auditoría sin exponer secretos.",
        fewShotExample:
          '{"content":"PrestaShop API key scoped + rotation 90d + TLS only","score":94,"highlights":["PrestaShop prefix","Revocation"],"metrics":["Auth audit"]}',
      },
      input,
      0.1,
    );
  }
}

export function getPrestaShopAuthAgent(): PrestaShopAuthAgent {
  return PrestaShopAuthAgent.instance;
}

export function resetPrestaShopAuthAgentForTests(): void {
  PrestaShopAuthAgent.reset();
}
