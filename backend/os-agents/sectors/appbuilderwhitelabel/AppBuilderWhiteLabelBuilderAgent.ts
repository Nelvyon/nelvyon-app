import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-builder";

export class AppBuilderWhiteLabelBuilderAgent {
  private static inst: AppBuilderWhiteLabelBuilderAgent | undefined;

  static get instance(): AppBuilderWhiteLabelBuilderAgent {
    if (!AppBuilderWhiteLabelBuilderAgent.inst) AppBuilderWhiteLabelBuilderAgent.inst = new AppBuilderWhiteLabelBuilderAgent();
    return AppBuilderWhiteLabelBuilderAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelBuilderAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Builder** — constructor visual sin código.";
    const mission =
      "Ensambla **páginas**, **componentes**, **navegación** y **lógica**; app funcional generada en **<10 minutos**.";
    const fewShot =
      '{"content":"Builder: páginas, componentes, navegación, lógica no-code, <10 min","score":92,"highlights":["<10 min","No-code"],"metrics":["Time to first app"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getAppBuilderWhiteLabelBuilderAgent(): AppBuilderWhiteLabelBuilderAgent {
  return AppBuilderWhiteLabelBuilderAgent.instance;
}

export function resetAppBuilderWhiteLabelBuilderAgentForTests(): void {
  AppBuilderWhiteLabelBuilderAgent.reset();
}
