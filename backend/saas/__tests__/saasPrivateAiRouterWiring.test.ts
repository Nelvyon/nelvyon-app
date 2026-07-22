/**
 * ADR-015 surface: SaaS Private AI exposes certified Model Router helpers.
 * Flags remain OFF by default — methods exist; runtime still gated by router/env.
 */
import { describe, expect, it } from "vitest";
import { SaasPrivateAiService } from "../SaasPrivateAiService";

describe("SaasPrivateAiService router wiring", () => {
  it("exposes platform/agent APIs and certified router helpers", () => {
    const svc = new SaasPrivateAiService({ query: async () => [] } as never);
    expect(typeof svc.getPlatformStatus).toBe("function");
    expect(typeof svc.runAgent).toBe("function");
    expect(typeof svc.getSettings).toBe("function");
    expect(typeof svc.routeInference).toBe("function");
    expect(typeof svc.executeInference).toBe("function");
    expect(typeof svc.getRouterHealthStatus).toBe("function");
  });
});
