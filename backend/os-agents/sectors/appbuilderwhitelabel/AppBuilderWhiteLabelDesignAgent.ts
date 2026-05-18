import type { ILlmClient } from "../../LlmClient";
import type { AppBuilderWhiteLabelInput, AppBuilderWhiteLabelOutput } from "./shared";
import { getDefaultAppBuilderWhiteLabelLlm, runAppBuilderWhiteLabelAgentCore } from "./shared";

const AGENT_ID = "appbuilderwhitelabel-design";

export class AppBuilderWhiteLabelDesignAgent {
  private static inst: AppBuilderWhiteLabelDesignAgent | undefined;

  static get instance(): AppBuilderWhiteLabelDesignAgent {
    if (!AppBuilderWhiteLabelDesignAgent.inst) AppBuilderWhiteLabelDesignAgent.inst = new AppBuilderWhiteLabelDesignAgent();
    return AppBuilderWhiteLabelDesignAgent.inst;
  }

  static reset(): void {
    AppBuilderWhiteLabelDesignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAppBuilderWhiteLabelLlm();
  }

  async run(input: AppBuilderWhiteLabelInput): Promise<AppBuilderWhiteLabelOutput> {
    const eliteRole = "Eres **AppBuilderWhiteLabel Design** — diseño white-label de apps móviles y PWA.";
    const mission =
      "Define **branding cliente**, **colores**, **logos** y **tipografía** con personalización **100%** desde día 1.";
    const fewShot =
      '{"content":"Design: branding, colores, logos, tipografía, 100% personalizable","score":93,"highlights":["100% brand","PWA day 1"],"metrics":["Brand consistency"]}';
    return runAppBuilderWhiteLabelAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getAppBuilderWhiteLabelDesignAgent(): AppBuilderWhiteLabelDesignAgent {
  return AppBuilderWhiteLabelDesignAgent.instance;
}

export function resetAppBuilderWhiteLabelDesignAgentForTests(): void {
  AppBuilderWhiteLabelDesignAgent.reset();
}
