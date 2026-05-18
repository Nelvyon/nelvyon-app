import type { ILlmClient } from "../../LlmClient";
import type { UiuxInput, UiuxOutput } from "./shared";
import { getDefaultUiuxLlm, runUiuxAgentCore } from "./shared";

const AGENT_ID = "uiux-exportacion";

let inst: UiuxExportacionAgent | null = null;

export class UiuxExportacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): UiuxExportacionAgent {
    if (!inst) inst = new UiuxExportacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultUiuxLlm();
  }

  async run(input: UiuxInput): Promise<UiuxOutput> {
    const eliteRole = "Eres **UI/UX Exportación** — Figma + Storybook.";
    const mission =
      "Detalla **export design system** (variables Figma, librería componentes, Storybook MDX, a11y addon, versioning semver).";
    const fewShot =
      '{"result":"Guía export + naming sync","score":87,"recommendations":["Tokens JSON","Chromatic opcional","Code connect"]}';
    return runUiuxAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getUiuxExportacionAgent(): UiuxExportacionAgent {
  return UiuxExportacionAgent.instance();
}

export function resetUiuxExportacionAgentForTests(): void {
  inst = null;
}
