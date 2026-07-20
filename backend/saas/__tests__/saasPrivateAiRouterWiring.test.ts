import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  getGlobalPrivateAiConfig,
  isLocalRouterEnabled,
  resetGlobalPrivateAiConfigForTests,
} from "../../private-ai/config";
import { getProviderRegistry, resetProviderRegistryForTests } from "../../private-ai/core/ProviderRegistry";
import { getPrivateAiRouter, resetPrivateAiRouterForTests } from "../../private-ai/PrivateAiRouter";
import { LocalModelRouterProvider } from "../../private-ai/providers/LocalModelRouterProvider";
import { resetSaasPrivateAiServiceForTests, SaasPrivateAiService } from "../SaasPrivateAiService";
import { resetLocalModelRouterForTests, resetRouterQueueForTests } from "../../local-ai/router";
import { resetInferenceGateForTests } from "../../local-ai/router/InferenceGate";
import { resetExecutionLimiterForTests } from "../../local-ai/router/ExecutionLimiter";

const TENANT = "8f873b4e-a1d0-4009-9e29-9ad978bea0f9";


vi.mock("../../private-ai/context/AgentContextEngine", () => ({
  buildAgentContext: vi.fn(async () => ({
    systemSuffix: "",
    meta: {
      sharedMemoryEntries: 0,
      tenantMemoryChunks: 0,
      ragChunks: 0,
      sharedMemoryEnabled: false,
      nelvyonFirst: true as const,
      grounded: false,
      domainHint: null,
    },
  })),
  maybeWriteAgentMemory: vi.fn(async () => ({ written: false })),
}));

vi.mock("../../local-ai/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../local-ai/router")>();
  return {
    ...actual,
    executeTask: vi.fn(async (input: { tenantId: string; query: string }) => ({
      taskId: "task-mock-1",
      status: "completed" as const,
      content: `Router response for: ${input.query}`,
      blocked: false,
      requiresApproval: false,
      meta: {
        taskId: "task-mock-1",
        tenantId: input.tenantId,
        taskType: "simple" as const,
        risk: "low" as const,
        initialModel: "llama3.2:3b-instruct-q4_K_M",
        finalModel: "llama3.2:3b-instruct-q4_K_M",
        modelReason: "fast_simple",
        fallbackUsed: false,
        fallbackReasons: [],
        durationMs: 42,
        temperature: 0.3,
        ragSources: [],
        validationPass: true,
        validationViolations: [],
        securityBlocked: false,
      },
    })),
    getRouterHealth: vi.fn(async () => ({
      ok: true,
      privateMode: false,
      postgres: true,
      ollama: true,
      fastModelAvailable: true,
      strategyModelAvailable: true,
      queueDepth: 0,
      circuitOpen: false,
      loadedModel: null,
    })),
  };
});

describe("Router → SaaS PrivateAI wiring", () => {
  beforeEach(() => {
    resetGlobalPrivateAiConfigForTests();
    resetPrivateAiRouterForTests();
    resetProviderRegistryForTests();
    resetSaasPrivateAiServiceForTests();
    resetLocalModelRouterForTests();
    resetRouterQueueForTests();
    resetInferenceGateForTests();
    resetExecutionLimiterForTests();
    vi.clearAllMocks();
  });

  it("registers local_router provider in registry", () => {
    const ids = getProviderRegistry().all().map((p) => p.id);
    expect(ids).toContain("local_router");
    expect(ids).toContain("local_ollama");
  });

  it("local_router enabled when OLLAMA_CONFIGURED=1 by default", () => {
    process.env.OLLAMA_CONFIGURED = "1";
    expect(isLocalRouterEnabled()).toBe(true);
    const p = new LocalModelRouterProvider(getGlobalPrivateAiConfig());
    expect(p.isConfigured()).toBe(true);
  });

  it("PrivateAiRouter local chain prefers local_router before local_ollama", async () => {
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.NELVYON_AI_MODE = "local";
    process.env.OLLAMA_CONFIGURED = "1";
    resetPrivateAiRouterForTests();
    resetProviderRegistryForTests();

    const router = getPrivateAiRouter();
    const chainProbe = router as unknown as { localProviderChain: () => string[] };
    expect(chainProbe.localProviderChain()).toEqual(["local_router", "local_ollama"]);
  });

  it("LocalModelRouterProvider maps completion to executeTask with tenantId", async () => {
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.OLLAMA_CONFIGURED = "1";
    const provider = new LocalModelRouterProvider(getGlobalPrivateAiConfig());
    const { executeTask } = await import("../../local-ai/router");

    const result = await provider.complete({
      messages: [
        { role: "system", content: "Agente test" },
        { role: "user", content: "Hola router" },
      ],
      routerContext: { tenantId: TENANT, agentId: "ceo_supervisor" },
    });

    expect(executeTask).toHaveBeenCalledOnce();
    expect(result.provider).toBe("local_router");
    expect(result.text).toContain("Hola router");
    expect(result.ready).toBe(true);
  });

  it("SaasPrivateAiService.routeInference returns decision without execute", () => {
    const db = { query: async () => [] };
    const svc = new SaasPrivateAiService(db as never);
    const d = svc.routeInference(TENANT, { query: "Hola" });
    expect(d.taskType).toBe("simple");
    expect(d.blocked).toBe(false);
  });

  it("SaasPrivateAiService.executeInference persists audit", async () => {
    const auditCalls: unknown[] = [];
    const db = {
      query: async (sql: string) => {
        if (sql.includes("INSERT INTO saas_private_ai_audit")) {
          auditCalls.push(sql);
          return [{ id: "audit-w1" }];
        }
        return [];
      },
    };
    const svc = new SaasPrivateAiService(db as never);
    const out = await svc.executeInference({
      tenantId: TENANT,
      userId: "user-1",
      query: "Resumen pipeline",
      agentId: "ceo_supervisor",
    });
    expect(out.auditId).toBe("audit-w1");
    expect(out.content).toContain("Resumen pipeline");
    expect(auditCalls.length).toBe(1);
  }, 15_000);

  it("getRouterHealthStatus delegates to certified router", async () => {
    const db = { query: async () => [] };
    const svc = new SaasPrivateAiService(db as never);
    const health = await svc.getRouterHealthStatus();
    expect(health.ok).toBe(true);
    expect(health.ollama).toBe(true);
  });
});
