// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return {
    ...actual,
    LlmClient: {
      ...actual.LlmClient,
      getInstance: vi.fn(),
    },
  };
});

vi.mock("../generative/GenerativeClient", () => ({
  GenerativeClient: {
    generateImage: vi.fn(),
  },
}));

import { GenerativeClient } from "../generative/GenerativeClient";
import { LlmClient } from "../LlmClient";
import {
  VideoEnhancerAgent,
  getVideoEnhancerAgent,
  resetVideoEnhancerAgentForTests,
} from "../videoEnhancerAgent";

const USER_ID = "00000000-0000-0000-0000-0000000000cc";

const SCRIPT_JSON = JSON.stringify({
  enhancedScript: "Better script",
  hooks: ["Hook A", "Hook B"],
  callToAction: "Subscribe now",
  suggestedHashtags: ["#growth", "#video"],
  shortVersion: "Short viral cut.",
});

const SUBS_JSON = JSON.stringify({
  segments: [
    { start: 0, end: 2, text: "Hello" },
    { start: 2, end: 4.5, text: "World" },
  ],
});

describe("VideoEnhancerAgent", () => {
  beforeEach(() => {
    resetVideoEnhancerAgentForTests();
    vi.clearAllMocks();
  });

  it("enhanceScript parsea JSON del LLM", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(SCRIPT_JSON) };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const agent = new VideoEnhancerAgent({ llm });
    const r = await agent.enhanceScript(USER_ID, {
      originalScript: "Draft…",
      platform: "youtube",
      targetDuration: 120,
      tone: "professional",
    });
    expect(r.enhancedScript).toBe("Better script");
    expect(r.hooks).toHaveLength(2);
    expect(r.callToAction).toBe("Subscribe now");
    expect(r.suggestedHashtags).toContain("#growth");
    expect(r.shortVersion).toContain("Short");
    expect(llm.complete).toHaveBeenCalledWith(
      expect.stringContaining("youtube"),
      expect.objectContaining({ temperature: 0.7 }),
    );
  });

  it("generateThumbnail usa DALL-E 1792x1024 hd", async () => {
    vi.mocked(GenerativeClient.generateImage).mockResolvedValue({
      url: "https://cdn.example/thumb.png",
      metadata: {},
    });
    const agent = new VideoEnhancerAgent();
    const r = await agent.generateThumbnail(USER_ID, {
      title: "Launch week",
      platform: "youtube",
      style: "bold",
      brandColors: ["#111"],
    });
    expect(r.imageUrl).toBe("https://cdn.example/thumb.png");
    expect(r.prompt).toContain("Launch week");
    expect(GenerativeClient.generateImage).toHaveBeenCalledWith(expect.stringContaining("youtube"), {
      size: "1792x1024",
      quality: "hd",
    });
  });

  it("generateSubtitles produce SRT y segmentos", async () => {
    const llm = { complete: vi.fn().mockResolvedValue(SUBS_JSON) };
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    const agent = new VideoEnhancerAgent({ llm });
    const r = await agent.generateSubtitles(USER_ID, "Hello World");
    expect(r.segments).toHaveLength(2);
    expect(r.srt).toContain("-->");
    expect(r.srt).toContain("Hello");
    expect(llm.complete).toHaveBeenCalledWith(
      expect.stringContaining("Transcript"),
      expect.objectContaining({ temperature: 0.1 }),
    );
  });

  it("saveEnhancement inserta fila", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "22222222-2222-2222-2222-222222222222",
        userId: USER_ID,
        type: "script",
        input: { x: 1 },
        result: { y: 2 },
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);
    const agent = new VideoEnhancerAgent({ db: { query } });
    const row = await agent.saveEnhancement(USER_ID, "script", { a: 1 }, { b: 2 });
    expect(row.type).toBe("script");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO video_enhancements"),
      [USER_ID, "script", JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 })],
    );
  });

  it("getEnhancements orden desc", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "z",
        userId: USER_ID,
        type: "thumbnail",
        input: {},
        result: {},
        createdAt: "2026-06-02T00:00:00.000Z",
      },
    ]);
    const agent = new VideoEnhancerAgent({ db: { query } });
    const rows = await agent.getEnhancements(USER_ID);
    expect(rows).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY created_at DESC"), [USER_ID]);
  });

  it("getVideoEnhancerAgent singleton", () => {
    resetVideoEnhancerAgentForTests();
    expect(getVideoEnhancerAgent()).toBe(getVideoEnhancerAgent());
  });
});
