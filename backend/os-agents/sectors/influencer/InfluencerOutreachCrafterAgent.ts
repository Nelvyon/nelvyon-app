import type { ILlmClient } from "../../LlmClient";
import type { InfluencerReachInput, InfluencerReachOutput } from "./influencerReachShared";
import { getDefaultInfluencerReachLlm, runInfluencerReachAgentCore } from "./influencerReachShared";

const AGENT_ID = "influencer-outreach-crafter";

export class InfluencerOutreachCrafterAgent {
  private static inst: InfluencerOutreachCrafterAgent | undefined;

  static get instance(): InfluencerOutreachCrafterAgent {
    if (!InfluencerOutreachCrafterAgent.inst) InfluencerOutreachCrafterAgent.inst = new InfluencerOutreachCrafterAgent();
    return InfluencerOutreachCrafterAgent.inst;
  }

  static reset(): void {
    InfluencerOutreachCrafterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultInfluencerReachLlm();
  }

  async run(input: InfluencerReachInput): Promise<InfluencerReachOutput> {
    return runInfluencerReachAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Copywriter B2C2C de élite; escribes DMs y emails que suenan humanos, específicos y respetuosos del tiempo del creator.",
        mission:
          "Redacta propuesta de colaboración personalizada (DM largo + versión corta) con valor para su audiencia y claridad de siguiente paso.",
        fewShotExample: `Input: primera colaboración con micro en nicho fitness.
Output JSON: tono cercano sin hype; score 88; recommendations sobre subject line, prueba social y CTA calendly.`,
      },
      input,
    );
  }
}

export function getInfluencerOutreachCrafterAgent(): InfluencerOutreachCrafterAgent {
  return InfluencerOutreachCrafterAgent.instance;
}

export function resetInfluencerOutreachCrafterAgentForTests(): void {
  InfluencerOutreachCrafterAgent.reset();
}
