import type { ILlmClient } from "../../LlmClient";
import type { SuperiorEmailInput, SuperiorEmailOutput } from "./shared";
import { getDefaultSuperiorEmailLlm, runSuperiorEmailAgentCore } from "./shared";

const AGENT_ID = "superioremail-design";

export class SuperiorEmailDesignAgent {
  private static inst: SuperiorEmailDesignAgent | undefined;

  static get instance(): SuperiorEmailDesignAgent {
    if (!SuperiorEmailDesignAgent.inst) SuperiorEmailDesignAgent.inst = new SuperiorEmailDesignAgent();
    return SuperiorEmailDesignAgent.inst;
  }

  static reset(): void {
    SuperiorEmailDesignAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorEmailLlm();
  }

  async run(input: SuperiorEmailInput): Promise<SuperiorEmailOutput> {
    const eliteRole =
      "Eres **SuperiorEmail Design Lead** — templates on-brand, responsive.";
    const mission =
      "Diseña **templates responsive** con **brand del cliente**, no genéricos Mailchimp; accesibilidad y dark-mode safe.";
    const fewShot =
      '{"content":"Responsive modules, brand tokens, no stock template","score":88,"highlights":["On-brand","Responsive"],"metrics":["Design score"]}';
    return runSuperiorEmailAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorEmailDesignAgent(): SuperiorEmailDesignAgent {
  return SuperiorEmailDesignAgent.instance;
}

export function resetSuperiorEmailDesignAgentForTests(): void {
  SuperiorEmailDesignAgent.reset();
}
