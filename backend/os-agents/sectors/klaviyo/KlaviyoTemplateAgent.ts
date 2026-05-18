import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-template";

export class KlaviyoTemplateAgent {
  private static inst: KlaviyoTemplateAgent | undefined;

  static get instance(): KlaviyoTemplateAgent {
    if (!KlaviyoTemplateAgent.inst) KlaviyoTemplateAgent.inst = new KlaviyoTemplateAgent();
    return KlaviyoTemplateAgent.inst;
  }

  static reset(): void {
    KlaviyoTemplateAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Email Template Engineer Klaviyo** — **HTML responsive** por sector, bloques reutilizables, dark-mode friendly y variables de perfil/evento.";
    const mission =
      "Genera **esqueleto HTML + guía de bloques**: hero, product grid, CTA, footer legal, unsubscribe; tokens `{{ person|lookup }}` y mejores prácticas móvil.";
    const fewShot =
      '{"content":"Responsive 600px + modular blocks + brand tokens","score":90,"highlights":["Mobile first","Variables"],"metrics":["Block list"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getKlaviyoTemplateAgent(): KlaviyoTemplateAgent {
  return KlaviyoTemplateAgent.instance;
}

export function resetKlaviyoTemplateAgentForTests(): void {
  KlaviyoTemplateAgent.reset();
}
