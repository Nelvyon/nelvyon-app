import type { ILlmClient } from "../../LlmClient";
import type { GCalZoomInput, GCalZoomOutput } from "./shared";
import { getDefaultGCalZoomLlm, runGCalZoomAgentCore } from "./shared";

const AGENT_ID = "gcalzoom-auth";

export class GCalZoomAuthAgent {
  private static inst: GCalZoomAuthAgent | undefined;

  static get instance(): GCalZoomAuthAgent {
    if (!GCalZoomAuthAgent.inst) GCalZoomAuthAgent.inst = new GCalZoomAuthAgent();
    return GCalZoomAuthAgent.inst;
  }

  static reset(): void {
    GCalZoomAuthAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultGCalZoomLlm();
  }

  async run(input: GCalZoomInput): Promise<GCalZoomOutput> {
    return runGCalZoomAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Dual OAuth broker; Google Calendar + Zoom apps instaladas.",
        mission:
          "Gestiona **OAuth2** para **Google Calendar** y **Zoom**: scopes calendario/listados eventos, reuniones Zoom, grabaciones (según política); refresh y revocación.",
        fewShotExample:
          '{"content":"Google offline_access + Zoom meeting:write granular.","score":93,"highlights":["PKCE","Tenant"],"metrics":["token_valid"]}',
      },
      input,
      0.1,
    );
  }
}

export function getGCalZoomAuthAgent(): GCalZoomAuthAgent {
  return GCalZoomAuthAgent.instance;
}

export function resetGCalZoomAuthAgentForTests(): void {
  GCalZoomAuthAgent.reset();
}
