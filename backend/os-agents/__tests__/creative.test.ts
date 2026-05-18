import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import { CreativeService } from "../creative/CreativeService";
import {
  CreativeAdCopyAgent,
  CreativeBrandVoiceAgent,
  CreativeNamingAgent,
  CreativeProductDescAgent,
  CreativeRepurposerAgent,
  CreativeSlideDecksAgent,
  CreativeTaglineGeneratorAgent,
  CreativeVideoScriptAgent,
  resetAllCreativeAgentsForTests,
} from "../sectors/creative";

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

function mockInsertReturning(overrides: Partial<Record<string, unknown>> = {}): void {
  queryMock.mockImplementation(async (sql: string, params: unknown[]) => {
    if (typeof sql === "string" && sql.includes("INSERT INTO creative_assets")) {
      return [
        {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          user_id: params[0],
          agent_id: params[1],
          asset_type: params[2],
          provider: params[3],
          prompt: params[4],
          url: params[5],
          status: params[6],
          metadata: params[7] != null ? JSON.parse(String(params[7])) : null,
          created_at: "2026-05-08T12:00:00.000Z",
          ...overrides,
        },
      ];
    }
    return [];
  });
}

describe("CreativeService", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    queryMock.mockReset();
    process.env.MIDJOURNEY_API_KEY = "mj-test";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.KLING_API_KEY = "kl-test";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("generateImage → Midjourney éxito → provider midjourney", async () => {
    mockInsertReturning();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (u.includes("cl.imagineapi.dev/items/images/") && init?.method === "POST") {
        return new Response(JSON.stringify({ id: "job-mj-1" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (u.includes("cl.imagineapi.dev/items/images/job-mj-1")) {
        return new Response(JSON.stringify({ status: "completed", url: "https://cdn.test/mj.png" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    const asset = await CreativeService.generateImage("a sunset", USER_ID);
    expect(asset.provider).toBe("midjourney");
    expect(asset.url).toBe("https://cdn.test/mj.png");
    expect(asset.status).toBe("done");
    expect(queryMock).toHaveBeenCalled();
  });

  it("generateImage → Midjourney falla → DALL·E → provider dalle", async () => {
    mockInsertReturning();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (u.includes("cl.imagineapi.dev")) {
        return new Response("bad", { status: 502 });
      }
      if (u.includes("api.openai.com/v1/images/generations")) {
        return new Response(JSON.stringify({ data: [{ url: "https://oai.test/out.png" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("no", { status: 500 });
    }) as typeof fetch;

    const asset = await CreativeService.generateImage("cats", USER_ID);
    expect(asset.provider).toBe("dalle");
    expect(asset.url).toBe("https://oai.test/out.png");
    expect(asset.status).toBe("done");
  });

  it("generateVideo → Kling éxito → provider kling", async () => {
    mockInsertReturning();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (u.includes("/videos/text2video") && init?.method === "POST") {
        return new Response(JSON.stringify({ task_id: "task-99" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (u.includes("/videos/text2video/task-99")) {
        return new Response(
          JSON.stringify({
            status: "succeed",
            data: { url: "https://cdn.test/video.mp4" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    const asset = await CreativeService.generateVideo("drone shot beach", USER_ID);
    expect(asset.provider).toBe("kling");
    expect(asset.url).toBe("https://cdn.test/video.mp4");
    expect(asset.status).toBe("done");
  });

  it("generateVideo → Kling falla → status failed", async () => {
    mockInsertReturning();
    globalThis.fetch = vi.fn(async () => new Response("err", { status: 503 })) as typeof fetch;

    const asset = await CreativeService.generateVideo("anything", USER_ID);
    expect(asset.provider).toBe("kling");
    expect(asset.status).toBe("failed");
    expect(asset.url).toBeNull();
  });
});

const CREATIVE_LIBRARY_JSON = JSON.stringify({
  content: "CREATE: Concept, Resonance, Emotion, Action, Test, Evolve aplicado.",
  score: 88,
  variants: ["Variante A bold", "Variante B premium", "Variante C humor suave"],
  formats: ["Instagram carousel", "LinkedIn post", "Newsletter snippet"],
});

const creativeLibraryInput = {
  userId: "00000000-0000-0000-0000-0000000044dd",
  sector: "consumer",
  brand: "NovaBrand",
  format: "multicanal",
  targetAudience: "Urban millennials",
  goal: "Lanzamiento producto",
  tone: "audaz",
};

describe("Creative Library agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CREATIVE_LIBRARY_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllCreativeAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertCreativeOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as {
      agentId: string;
      content: string;
      score: number;
      variants: string[];
      formats: string[];
    };
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(typeof out.score).toBe("number");
    expect(out.variants.length).toBeGreaterThanOrEqual(1);
    expect(out.formats.length).toBeGreaterThanOrEqual(1);
  }

  it("CreativeBrandVoiceAgent", async () => {
    await assertCreativeOutput("creative-brand-voice", () => CreativeBrandVoiceAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeAdCopyAgent", async () => {
    await assertCreativeOutput("creative-ad-copy", () => CreativeAdCopyAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeVideoScriptAgent", async () => {
    await assertCreativeOutput("creative-video-script", () => CreativeVideoScriptAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeSlideDecksAgent", async () => {
    await assertCreativeOutput("creative-slide-decks", () => CreativeSlideDecksAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeTaglineGeneratorAgent", async () => {
    await assertCreativeOutput("creative-tagline-generator", () => CreativeTaglineGeneratorAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeProductDescAgent", async () => {
    await assertCreativeOutput("creative-product-desc", () => CreativeProductDescAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeNamingAgent", async () => {
    await assertCreativeOutput("creative-naming", () => CreativeNamingAgent.instance.run(creativeLibraryInput));
  });

  it("CreativeRepurposerAgent", async () => {
    await assertCreativeOutput("creative-repurposer", () => CreativeRepurposerAgent.instance.run(creativeLibraryInput));
  });
});
