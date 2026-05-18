// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../generative/GenerativeClient", () => ({
  GenerativeClient: {
    generateImage: vi.fn(),
  },
}));

import { GenerativeClient } from "../generative/GenerativeClient";
import {
  LogoDesignerAgent,
  getLogoDesignerAgent,
  resetLogoDesignerAgentForTests,
} from "../logoDesignerAgent";

const USER_ID = "00000000-0000-0000-0000-0000000000bb";

describe("LogoDesignerAgent", () => {
  beforeEach(() => {
    resetLogoDesignerAgentForTests();
    vi.clearAllMocks();
  });

  it("generateLogo devuelve url y prompts", async () => {
    vi.mocked(GenerativeClient.generateImage).mockResolvedValue({
      url: "https://cdn.example/logo.png",
      metadata: { revised_prompt: "revised marketing prompt" },
    });
    const agent = new LogoDesignerAgent();
    const r = await agent.generateLogo(USER_ID, {
      brandName: "Acme",
      industry: "software",
      style: "modern",
      colors: ["#111", "#eee"],
    });
    expect(r.imageUrl).toBe("https://cdn.example/logo.png");
    expect(r.prompt).toContain("Professional logo for Acme");
    expect(r.prompt).toContain("software company");
    expect(r.revisedPrompt).toBe("revised marketing prompt");
    expect(GenerativeClient.generateImage).toHaveBeenCalledWith(
      expect.stringContaining("Acme"),
      { size: "1024x1024", quality: "hd" },
    );
  });

  it("generateVariants devuelve 3 resultados", async () => {
    let n = 0;
    vi.mocked(GenerativeClient.generateImage).mockImplementation(async () => {
      n += 1;
      return { url: `https://cdn.example/v${n}.png`, metadata: { revised_prompt: `rev ${n}` } };
    });
    const agent = new LogoDesignerAgent();
    const results = await agent.generateVariants(
      USER_ID,
      { brandName: "Beta", industry: "retail", style: "minimalist" },
      3,
    );
    expect(results).toHaveLength(3);
    expect(results.map((x) => x.imageUrl)).toEqual([
      "https://cdn.example/v1.png",
      "https://cdn.example/v2.png",
      "https://cdn.example/v3.png",
    ]);
    expect(GenerativeClient.generateImage).toHaveBeenCalledTimes(3);
  });

  it("saveLogo inserta fila", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        userId: USER_ID,
        brandName: "Gamma",
        input: { brandName: "Gamma", industry: "food", style: "playful" },
        imageUrl: "https://x/img.png",
        prompt: "p",
        revisedPrompt: "r",
        createdAt: new Date("2026-05-01T12:00:00.000Z"),
      },
    ]);
    const agent = new LogoDesignerAgent({ db: { query } });
    const saved = await agent.saveLogo(
      USER_ID,
      { brandName: "Gamma", industry: "food", style: "playful" },
      { imageUrl: "https://x/img.png", prompt: "p", revisedPrompt: "r" },
    );
    expect(saved.brandName).toBe("Gamma");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO generated_logos"),
      [USER_ID, "Gamma", expect.any(String), "https://x/img.png", "p", "r"],
    );
  });

  it("getLogos lista por fecha desc", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "a",
        userId: USER_ID,
        brandName: "Z",
        input: { brandName: "Z", industry: "x", style: "bold" },
        imageUrl: "https://u1",
        prompt: "p1",
        revisedPrompt: null,
        createdAt: "2026-05-02T00:00:00.000Z",
      },
    ]);
    const agent = new LogoDesignerAgent({ db: { query } });
    const logos = await agent.getLogos(USER_ID);
    expect(logos).toHaveLength(1);
    expect(logos[0].brandName).toBe("Z");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ORDER BY created_at DESC"), [USER_ID]);
  });

  it("getLogoDesignerAgent singleton", () => {
    resetLogoDesignerAgentForTests();
    const a = getLogoDesignerAgent();
    const b = getLogoDesignerAgent();
    expect(a).toBe(b);
  });
});
