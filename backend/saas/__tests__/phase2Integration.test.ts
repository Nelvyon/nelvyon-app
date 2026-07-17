import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InMemorySharedMemoryStore,
  setSharedMemoryStoreForTests,
  resetSharedMemoryStoreSingletonForTests,
  resetInMemorySharedMemoryStoreForTests,
} from "../../shared-memory";
import { resetSaasSharedMemoryServiceForTests } from "../SaasSharedMemoryService";
import { buildAgentContext, maybeWriteAgentMemory } from "../../private-ai/context/AgentContextEngine";
import { preferLocalRag, UnifiedRagStore, resetUnifiedRagStoreForTests } from "../../private-ai/rag/UnifiedRagStore";
import { agentToolToMcp, mcpToolToAgent } from "../../private-ai/tools/toolIdMap";
import {
  DisabledOpenClawBridge,
  HttpOpenClawBridge,
  getOpenClawBridge,
  resetOpenClawBridgeForTests,
} from "../../private-ai/adapters/OpenClawBridge";
import { isOpenClawRuntimeAuthorized } from "../../openclaw";
import {
  getPrivateAiMetricsSnapshot,
  incPrivateAiMetric,
  resetPrivateAiMetricsForTests,
} from "../../private-ai/observability/PrivateAiMetrics";

describe("AgentContextEngine + Shared Memory", () => {
  beforeEach(() => {
    process.env.NELVYON_SHARED_MEMORY_ENABLED = "1";
    process.env.NELVYON_SHARED_MEMORY_BACKEND = "memory";
    process.env.NELVYON_SHARED_MEMORY_AUTO_WRITE = "1";
    resetInMemorySharedMemoryStoreForTests();
    resetSharedMemoryStoreSingletonForTests();
    resetSaasSharedMemoryServiceForTests();
    setSharedMemoryStoreForTests(new InMemorySharedMemoryStore());
  });

  afterEach(() => {
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
    delete process.env.NELVYON_SHARED_MEMORY_BACKEND;
    delete process.env.NELVYON_SHARED_MEMORY_AUTO_WRITE;
    setSharedMemoryStoreForTests(null);
    resetInMemorySharedMemoryStoreForTests();
    resetSharedMemoryStoreSingletonForTests();
    resetSaasSharedMemoryServiceForTests();
  });

  it("builds context with shared memory entries", async () => {
    await maybeWriteAgentMemory({
      tenantId: "00000000-0000-0000-0000-0000000000aa",
      userId: "u1",
      agentId: "ceo_supervisor",
      roles: ["owner"],
      allowedTools: ["memory.write", "memory.read"],
      query: "¿Cuál es el tono de marca?",
      output: "Profesional en español",
    });

    const ctx = await buildAgentContext({
      tenantId: "00000000-0000-0000-0000-0000000000aa",
      userId: "u1",
      agentId: "ceo_supervisor",
      query: "profesional",
      roles: ["owner"],
      allowedTools: ["memory.read", "rag.search"],
      rag: {
        searchPlatform: async () => ({ chunks: [], query: "", source: "platform" }),
        countPlatform: async () => 0,
      },
      memory: {
        list: async () => [],
        search: async () => [],
        formatForPrompt: () => "",
      } as never,
    });

    expect(ctx.meta.sharedMemoryEnabled).toBe(true);
    expect(ctx.meta.sharedMemoryEntries).toBeGreaterThanOrEqual(1);
    expect(ctx.systemSuffix).toMatch(/Memoria compartida/i);
  });
});

describe("Unified RAG facade", () => {
  afterEach(() => {
    delete process.env.NELVYON_RAG_PREFER_LOCAL;
    resetUnifiedRagStoreForTests();
  });

  it("defaults to prefer local RAG", () => {
    expect(preferLocalRag()).toBe(true);
    process.env.NELVYON_RAG_PREFER_LOCAL = "0";
    expect(preferLocalRag()).toBe(false);
  });

  it("falls back to adjunct when local empty/unavailable", async () => {
    process.env.NELVYON_RAG_PREFER_LOCAL = "0";
    const db = {
      query: vi.fn().mockResolvedValue([
        {
          id: "1",
          source: "docs",
          title: "T",
          content: "contenido rag adjunct",
          tags: [],
        },
      ]),
    };
    const store = new UnifiedRagStore(db as never);
    const res = await store.searchPlatform("contenido", 3);
    expect(res.chunks[0]?.content).toContain("adjunct");
  });
});

describe("Tool ID map + OpenClaw + metrics", () => {
  afterEach(() => {
    delete process.env.NELVYON_OPENCLAW_BRIDGE_ENABLED;
    delete process.env.NELVYON_SHARED_MEMORY_ENABLED;
    delete process.env.NELVYON_OPENCLAW_BRIDGE_URL;
    resetOpenClawBridgeForTests();
    resetPrivateAiMetricsForTests();
  });

  it("maps agent tools to MCP names", () => {
    expect(agentToolToMcp("memory.read")).toBe("memory_read");
    expect(mcpToolToAgent("rag_search")).toBe("rag.search");
  });

  it("OpenClaw Http bridge stays disabled without auth", async () => {
    const b = new HttpOpenClawBridge();
    expect(b.status()).toBe("disabled");
    const r = await b.dispatch({ agentId: "a", input: "x", tenantId: "t" });
    expect(r.ok).toBe(false);
    expect(isOpenClawRuntimeAuthorized()).toBe(false);
  });

  it("getOpenClawBridge returns Disabled by default", () => {
    resetOpenClawBridgeForTests();
    expect(getOpenClawBridge()).toBeInstanceOf(DisabledOpenClawBridge);
  });

  it("metrics counters increment", () => {
    resetPrivateAiMetricsForTests();
    incPrivateAiMetric("agentRuns", 2);
    expect(getPrivateAiMetricsSnapshot().counters.agentRuns).toBe(2);
  });
});
