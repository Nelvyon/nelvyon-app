// @ts-nocheck
import { describe, expect, it, vi } from "vitest";

import { AgentLanguageService } from "../AgentLanguageService";

describe("AgentLanguageService", () => {
  it("detectLanguage detecta español e inglés", () => {
    const svc = new AgentLanguageService({ db: { query: vi.fn() } as never });
    expect(svc.detectLanguage("Hola, necesito ayuda con mi campaña")).toBe("es");
    expect(svc.detectLanguage("Hello, I need help with my campaign")).toBe("en");
  });

  it("detectLanguage detecta ruso y chino por script", () => {
    const svc = new AgentLanguageService({ db: { query: vi.fn() } as never });
    expect(svc.detectLanguage("Привет, нужна помощь")).toBe("ru");
    expect(svc.detectLanguage("你好，我需要帮助")).toBe("zh");
  });

  it("getLanguagePromptInstruction construye instrucción del LLM", () => {
    const svc = new AgentLanguageService({ db: { query: vi.fn() } as never });
    expect(svc.getLanguagePromptInstruction("fr")).toContain("Respond exclusively in French");
  });

  it("setUserLanguagePreference guarda preferencia", async () => {
    const query = vi.fn().mockResolvedValueOnce([{ tenant_id: "t-1" }]).mockResolvedValueOnce([]);
    const svc = new AgentLanguageService({ db: { query } as never });
    const out = await svc.setUserLanguagePreference("u-1", "de");
    expect(out).toBe("de");
    expect(String(query.mock.calls[1]?.[0])).toContain("INSERT INTO saas_client_profiles");
  });

  it("getUserLanguagePreference devuelve langCode o auto", async () => {
    const q1 = vi.fn().mockResolvedValueOnce([{ language: "it" }]);
    const svc1 = new AgentLanguageService({ db: { query: q1 } as never });
    await expect(svc1.getUserLanguagePreference("u-1")).resolves.toBe("it");
    const q2 = vi.fn().mockResolvedValueOnce([]);
    const svc2 = new AgentLanguageService({ db: { query: q2 } as never });
    await expect(svc2.getUserLanguagePreference("u-2")).resolves.toBe("auto");
  });

  it("buildMultilingualSystemPrompt combina prompt base + idioma", () => {
    const svc = new AgentLanguageService({ db: { query: vi.fn() } as never });
    const out = svc.buildMultilingualSystemPrompt("You are NELVYON assistant.", "pt");
    expect(out).toContain("You are NELVYON assistant.");
    expect(out).toContain("Respond exclusively in Portuguese");
  });
});
