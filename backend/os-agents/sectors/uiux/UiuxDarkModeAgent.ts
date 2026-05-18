import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-dark-mode";

let inst: UiuxDarkModeAgent | null = null;

export class UiuxDarkModeAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxDarkModeAgent {
    if (!inst) inst = new UiuxDarkModeAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Dark/Light** — theming dual.";
    const mission =
      "Define **estrategia dark + light** (tokens duales, charts/imágenes, prefers-color-scheme, transiciones sin parpadeo).";
    const fewShot =
      '{"result":"Mapa tokens light/dark","score":88,"recommendations":["Elevation en dark","Charts palette","SSR class"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxDarkModeAgent(): UiuxDarkModeAgent {
  return UiuxDarkModeAgent.instance();
}

export function resetUiuxDarkModeAgentForTests(): void {
  inst = null;
}
