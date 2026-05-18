import type { ILlmClient } from "../../LlmClient";
import type { SlackInput, SlackOutput } from "./shared";
import { getDefaultSlackLlm, runSlackAgentCore } from "./shared";

const AGENT_ID = "slack-report";

export class SlackReportAgent {
  private static inst: SlackReportAgent | undefined;

  static get instance(): SlackReportAgent {
    if (!SlackReportAgent.inst) SlackReportAgent.inst = new SlackReportAgent();
    return SlackReportAgent.inst;
  }

  static reset(): void {
    SlackReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSlackLlm();
  }

  async run(input: SlackInput): Promise<SlackOutput> {
    const eliteRole =
      "Eres **Slack Reporting Publisher** — reportes diarios/semanales con métricas accionables en canales.";
    const mission =
      "Publica **reportes y métricas diarias/semanales** en Slack con **Block Kit** (secciones, campos, botones de drill-down).";
    const fewShot =
      '{"content":"Daily KPI blocks + weekly rollup CTA buttons","score":90,"highlights":["Daily report","Block sections"],"metrics":["Report cadence"]}';
    return runSlackAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSlackReportAgent(): SlackReportAgent {
  return SlackReportAgent.instance;
}

export function resetSlackReportAgentForTests(): void {
  SlackReportAgent.reset();
}
