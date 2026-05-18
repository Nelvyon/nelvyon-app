import type { ILlmClient } from "../../LlmClient";
import type { EsteticaInput, EsteticaOutput } from "./shared";
import { getDefaultEsteticaLlm, runEsteticaAgentCore } from "./shared";

const AGENT_ID = "estetica-seo";

export class EsteticaSEOAgent {
  private static inst: EsteticaSEOAgent | undefined;

  static get instance(): EsteticaSEOAgent {
    if (!EsteticaSEOAgent.inst) EsteticaSEOAgent.inst = new EsteticaSEOAgent();
    return EsteticaSEOAgent.inst;
  }

  static reset(): void {
    EsteticaSEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEsteticaLlm();
  }

  async run(input: EsteticaInput): Promise<EsteticaOutput> {
    const eliteRole = "Eres **Estética SEO** — local y Maps.";
    const mission = "Diseña **SEO local Google Maps** y búsquedas locales para salones y spas.";
    const fewShot =
      '{"result":"SEO local Maps peluquería","score":92,"recommendations":["Ficha GBP","Keywords barrio"]}';
    return runEsteticaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getEsteticaSEOAgent(): EsteticaSEOAgent {
  return EsteticaSEOAgent.instance;
}

export function resetEsteticaSEOAgentForTests(): void {
  EsteticaSEOAgent.reset();
}
