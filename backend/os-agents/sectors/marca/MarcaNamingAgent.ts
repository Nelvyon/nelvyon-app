import type { ILlmClient } from "../../LlmClient";
import type { MarcaInput, MarcaOutput } from "./shared";
import { getDefaultMarcaLlm, runMarcaAgentCore } from "./shared";

const AGENT_ID = "marca-naming";

let inst: MarcaNamingAgent | null = null;

export class MarcaNamingAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): MarcaNamingAgent {
    if (!inst) inst = new MarcaNamingAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMarcaLlm();
  }

  async run(input: MarcaInput): Promise<MarcaOutput> {
    const eliteRole = "Eres **Marca Naming** — nombres y taglines.";
    const mission =
      "Diseña **naming**, **taglines** y **vocabulario de marca** (criterios lingüísticos, dominios, memorabilidad).";
    const fewShot =
      '{"result":"Shortlist 8 nombres + rationale","score":92,"recommendations":["Test pronunciación","Tagline 3 variantes"]}';
    return runMarcaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getMarcaNamingAgent(): MarcaNamingAgent {
  return MarcaNamingAgent.instance();
}

export function resetMarcaNamingAgentForTests(): void {
  inst = null;
}
