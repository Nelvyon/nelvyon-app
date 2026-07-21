/**
 * Deploy-safe Private AI SaaS surface after Phase-2 barrel revert (28571476).
 * Full router wiring (local-ai/router + LocalModelRouterProvider) is not in the
 * Railway deploy tree yet — do not reintroduce getRouterHealthStatus/executeInference
 * until those modules are committed and exported.
 */
import { describe, expect, it } from "vitest";
import { SaasPrivateAiService } from "../SaasPrivateAiService";

describe("SaasPrivateAiService deploy-safe surface", () => {
  it("exposes platform/agent APIs without Phase-2 router helpers", () => {
    const svc = new SaasPrivateAiService({ query: async () => [] } as never);
    expect(typeof svc.getPlatformStatus).toBe("function");
    expect(typeof svc.runAgent).toBe("function");
    expect(typeof svc.getSettings).toBe("function");
    expect("getRouterHealthStatus" in svc).toBe(false);
    expect("executeInference" in svc).toBe(false);
  });
});
