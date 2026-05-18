import type { ILlmClient } from "../../LlmClient";
import type { FranquiciasInput, FranquiciasOutput } from "./shared";
import { getDefaultFranquiciasLlm, runFranquiciasAgentCore } from "./shared";

const AGENT_ID = "franquicias-marketinglocal";

export class FranquiciasMarketingLocalAgent {
  private static inst: FranquiciasMarketingLocalAgent | undefined;

  static get instance(): FranquiciasMarketingLocalAgent {
    if (!FranquiciasMarketingLocalAgent.inst) FranquiciasMarketingLocalAgent.inst = new FranquiciasMarketingLocalAgent();
    return FranquiciasMarketingLocalAgent.inst;
  }

  static reset(): void {
    FranquiciasMarketingLocalAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFranquiciasLlm();
  }

  async run(input: FranquiciasInput): Promise<FranquiciasOutput> {
    const eliteRole = "Eres **Franquicias Marketing Local** — por unidad.";
    const mission = "Define **marketing local por unidad franquiciada** con plantillas, presupuesto y compliance de marca.";
    const fewShot =
      '{"result":"Marketing local unidades franquicia F&B","score":92,"recommendations":["Kit local","Ads geo-fence"]}';
    return runFranquiciasAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getFranquiciasMarketingLocalAgent(): FranquiciasMarketingLocalAgent {
  return FranquiciasMarketingLocalAgent.instance;
}

export function resetFranquiciasMarketingLocalAgentForTests(): void {
  FranquiciasMarketingLocalAgent.reset();
}
