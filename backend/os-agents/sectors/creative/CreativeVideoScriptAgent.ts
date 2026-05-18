import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-video-script";

export class CreativeVideoScriptAgent {
  private static inst: CreativeVideoScriptAgent | undefined;

  static get instance(): CreativeVideoScriptAgent {
    if (!CreativeVideoScriptAgent.inst) CreativeVideoScriptAgent.inst = new CreativeVideoScriptAgent();
    return CreativeVideoScriptAgent.inst;
  }

  static reset(): void {
    CreativeVideoScriptAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCreativeLlm();
  }

  async run(input: CreativeInput): Promise<CreativeOutput> {
    return runCreativeAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Director creativo spot corto top 1%; ritmo por segundo y supers.",
        mission:
          "Escribe scripts de video 15s, 30s y 60s para ads y RRSS: VO, visual, texto en pantalla, CTA.",
        fewShotExample:
          "Input: producto físico. Output JSON: tres duraciones; variants CTA final; formats vertical 9:16 y 1:1.",
      },
      input,
    );
  }
}

export function getCreativeVideoScriptAgent(): CreativeVideoScriptAgent {
  return CreativeVideoScriptAgent.instance;
}

export function resetCreativeVideoScriptAgentForTests(): void {
  CreativeVideoScriptAgent.reset();
}
