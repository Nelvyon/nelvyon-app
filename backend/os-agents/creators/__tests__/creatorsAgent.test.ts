// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

vi.mock("../../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: vi.fn().mockResolvedValue("mocked output with creator value for creator sector and actionable plan."),
    }),
  },
}));

import { OsAgentError } from "../../OsAgentError";
import type { ValidationResult } from "../../AgentQualityService";
import { CreatorsAgentService, type CreatorAgentSlug } from "../CreatorsAgentService";

const USER_ID = "user-creator-1";

function makeDeps() {
  const query = vi.fn().mockResolvedValue([{ id: "result-1" }]);
  const quality = {
    buildEnhancedPrompt: vi.fn(async (base: string) => `${base}\nENHANCED`),
    validateOutput: vi.fn<(...args: unknown[]) => Promise<ValidationResult>>(
      async () => ({ valid: true, score: 95, issues: [] }),
    ),
  };
  return { query, quality };
}

describe("CreatorsAgentService", () => {
  it("videoMontage", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.videoMontage(USER_ID, { topic: "gaming" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "video-montage"]));
  });

  it("thumbnail", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.thumbnail(USER_ID, { niche: "fitness" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "thumbnail"]));
  });

  it("scriptWriter", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.scriptWriter(USER_ID, { duration: "10m" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "script-writer"]));
  });

  it("multilingualSubtitles", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.multilingualSubtitles(USER_ID, { langs: ["es", "en"] });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "multilingual-subtitles"]));
  });

  it("viralClip", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.viralClip(USER_ID, { transcript: "..." });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "viral-clip"]));
  });

  it("youtubeSeO", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.youtubeSeO(USER_ID, { keyword: "ai tools" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "youtube-seo"]));
  });

  it("newsletterCreator", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.newsletterCreator(USER_ID, { audience: "subscribers" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "newsletter-creator"]));
  });

  it("merchDesign", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.merchDesign(USER_ID, { theme: "retro" });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "merch-design"]));
  });

  it("bioLinkPage", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    const r = await service.bioLinkPage(USER_ID, { links: 5 });
    expect(r.success).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO os_results"), expect.arrayContaining([USER_ID, "bio-link-page"]));
  });

  it("agente inválido", async () => {
    const { query, quality } = makeDeps();
    const service = new CreatorsAgentService({ db: { query }, quality });
    await expect(service.executeBySlug("invalid-agent" as CreatorAgentSlug, USER_ID, {})).rejects.toBeInstanceOf(OsAgentError);
  });
});
