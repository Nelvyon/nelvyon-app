import type { ILlmClient } from "../../LlmClient";
import type { WooCommerceInput, WooCommerceOutput } from "./shared";
import { getDefaultWooCommerceLlm, runWooCommerceAgentCore } from "./shared";

const AGENT_ID = "woocommerce-auth";

export class WooCommerceAuthAgent {
  private static inst: WooCommerceAuthAgent | undefined;

  static get instance(): WooCommerceAuthAgent {
    if (!WooCommerceAuthAgent.inst) WooCommerceAuthAgent.inst = new WooCommerceAuthAgent();
    return WooCommerceAuthAgent.inst;
  }

  static reset(): void {
    WooCommerceAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultWooCommerceLlm();
  }

  async run(input: WooCommerceInput): Promise<WooCommerceOutput> {
    return runWooCommerceAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: WC REST credentials vault; nunca loguear secretos.",
        mission:
          "Gestiona autenticación **REST API WooCommerce** con **Consumer Key** y **Consumer Secret**; HTTPS, permisos read/write mínimos por caso de uso.",
        fewShotExample:
          '{"content":"OAuth-like keys ck_/cs_ rotadas trimestral.","score":93,"highlights":["TLS only","Scopes"],"metrics":["connected"]}',
      },
      input,
      0.1,
    );
  }
}

export function getWooCommerceAuthAgent(): WooCommerceAuthAgent {
  return WooCommerceAuthAgent.instance;
}

export function resetWooCommerceAuthAgentForTests(): void {
  WooCommerceAuthAgent.reset();
}
