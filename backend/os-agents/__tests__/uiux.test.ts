// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  resetAllUiuxAgentsForTests,
  UiuxAbTestingAgent,
  UiuxAccesibilidadAgent,
  UiuxAuditoriaAgent,
  UiuxComponentesAgent,
  UiuxDarkModeAgent,
  UiuxExportacionAgent,
  UiuxSistemaDisenioAgent,
  UiuxWireframeAgent,
} from "../sectors/uiux";

const UIUX_JSON = JSON.stringify({
  result: "UI/UX OS: tokens semánticos, wireframes y export Storybook alineado.",
  score: 90,
  recommendations: ["WCAG AA contrast", "Figma variables", "A11y addon"],
});

const uiuxInput = {
  userId: "00000000-0000-0000-0000-00000000ux01",
  businessName: "Producto demo",
  services: ["React", "Tailwind"],
  targets: ["B2B", "ES"],
};

describe("Uiux agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(UIUX_JSON);
    resetAllUiuxAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("UiuxSistemaDisenioAgent", async () => {
    await assertOutput("uiux-sistema-diseno", () => UiuxSistemaDisenioAgent.instance().run(uiuxInput));
  });
  it("UiuxWireframeAgent", async () => {
    await assertOutput("uiux-wireframe", () => UiuxWireframeAgent.instance().run(uiuxInput));
  });
  it("UiuxComponentesAgent", async () => {
    await assertOutput("uiux-componentes", () => UiuxComponentesAgent.instance().run(uiuxInput));
  });
  it("UiuxAuditoriaAgent", async () => {
    await assertOutput("uiux-auditoria", () => UiuxAuditoriaAgent.instance().run(uiuxInput));
  });
  it("UiuxAbTestingAgent", async () => {
    await assertOutput("uiux-ab-testing", () => UiuxAbTestingAgent.instance().run(uiuxInput));
  });
  it("UiuxAccesibilidadAgent", async () => {
    await assertOutput("uiux-accesibilidad", () => UiuxAccesibilidadAgent.instance().run(uiuxInput));
  });
  it("UiuxDarkModeAgent", async () => {
    await assertOutput("uiux-dark-mode", () => UiuxDarkModeAgent.instance().run(uiuxInput));
  });
  it("UiuxExportacionAgent", async () => {
    await assertOutput("uiux-exportacion", () => UiuxExportacionAgent.instance().run(uiuxInput));
  });
});
