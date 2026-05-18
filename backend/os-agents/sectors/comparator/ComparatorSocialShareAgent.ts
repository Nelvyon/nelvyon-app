import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-social-share";

export class ComparatorSocialShareAgent {
  private static inst: ComparatorSocialShareAgent | undefined;

  static get instance(): ComparatorSocialShareAgent {
    if (!ComparatorSocialShareAgent.inst) ComparatorSocialShareAgent.inst = new ComparatorSocialShareAgent();
    return ComparatorSocialShareAgent.inst;
  }

  static reset(): void {
    ComparatorSocialShareAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComparatorLlm();
  }

  async run(input: ComparatorInput): Promise<ComparatorOutput> {
    return runComparatorAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Growth copy top 1%; posts de resultados creíbles sin hype ilegal o claims no sustentados.",
        mission:
          "Genera contenido listo para RRSS (hooks, carrusel bullets, CTA) a partir del antes/después verificado en el brief.",
        fewShotExample:
          '{"content":"LinkedIn: Hook: En 90 días pasamos de X a Y sin magia—solo foco en [métrica]. Carousel: slide1 problema, slide2 cambio, slide3 número clave del brief. CTA: DM si quieres el playbook. IG: carrusel 5 slides + reel script 30s. Own: cifras solo si están en datos. Result: kit listo. More: A/B hook A/B.","score":89,"improvements":["Kit LinkedIn + IG","CTA compliance-first"],"visualData":["Slide hero: −35% tiempo respuesta","Reel: VO 30s"]}',
      },
      input,
      0.5,
    );
  }
}

export function getComparatorSocialShareAgent(): ComparatorSocialShareAgent {
  return ComparatorSocialShareAgent.instance;
}

export function resetComparatorSocialShareAgentForTests(): void {
  ComparatorSocialShareAgent.reset();
}
