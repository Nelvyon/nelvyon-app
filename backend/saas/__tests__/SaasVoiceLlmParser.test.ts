import { describe, it, expect } from "vitest";

import { mapLlmVoiceJson } from "../SaasVoiceLlmParser";

describe("SaasVoiceLlmParser", () => {
  it("mapLlmVoiceJson returns navigate result", () => {
    const out = mapLlmVoiceJson("ir al crm", {
      success: true,
      actionType: "navigate",
      route: "/saas/crm",
      message: "Abriendo CRM",
    });
    expect(out?.success).toBe(true);
    expect(out?.route).toBe("/saas/crm");
    expect(out?.intent?.actionType).toBe("navigate");
  });

  it("mapLlmVoiceJson returns null for unknown", () => {
    expect(mapLlmVoiceJson("xyz", { success: true, actionType: "unknown" })).toBeNull();
    expect(mapLlmVoiceJson("", { success: true, actionType: "navigate" })).toBeNull();
  });
});
