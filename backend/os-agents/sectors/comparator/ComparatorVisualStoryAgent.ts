import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-visual-story";

export class ComparatorVisualStoryAgent {
  private static inst: ComparatorVisualStoryAgent | undefined;

  static get instance(): ComparatorVisualStoryAgent {
    if (!ComparatorVisualStoryAgent.inst) ComparatorVisualStoryAgent.inst = new ComparatorVisualStoryAgent();
    return ComparatorVisualStoryAgent.inst;
  }

  static reset(): void {
    ComparatorVisualStoryAgent.inst = undefined;
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
          "ROLE: Story designer top 1%; arcos visuales antes/después para decks y casos de uso.",
        mission:
          "Construye historia visual de transformación: escenas, ejes de gráfico sugeridos y momentos ‘antes/después’ para diseño.",
        fewShotExample:
          '{"content":"Then: dashboard plano, sin cohortes. Results: vista ejecutiva con cohortes D7/D30. Achieved: narrativa en 3 paneles. Numbers: retención +12pts según brief. Show: Panel A barras, Panel B línea temporal, Panel C highlight WIN. Frame: progreso humano + datos. Own: datos son los del cliente. Result: historia memorable. More: animar transición A→B.","score":86,"improvements":["3 paneles narrativos","Highlight de win medible"],"visualData":["Bar: conversión 2.1%→3.4%","Line: retención D30"]}',
      },
      input,
      0.5,
    );
  }
}

export function getComparatorVisualStoryAgent(): ComparatorVisualStoryAgent {
  return ComparatorVisualStoryAgent.instance;
}

export function resetComparatorVisualStoryAgentForTests(): void {
  ComparatorVisualStoryAgent.reset();
}
