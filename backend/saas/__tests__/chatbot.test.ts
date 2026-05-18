// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ChatbotService,
  getChatbotService,
  resetChatbotServiceForTests,
} from "../ChatbotService";

const USER_ID = "00000000-0000-0000-0000-0000000000ff";
const CHATBOT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const CONFIG_ROW = {
  id: CHATBOT_ID,
  user_id: USER_ID,
  name: "Bot",
  greeting: "Hi",
  system_prompt: "Be helpful",
  config: {
    captureLeads: true,
    escalateKeywords: ["agente"],
    allowBooking: false,
    theme: "dark",
  },
  primary_color: "#ff0000",
  created_at: new Date("2026-01-01T00:00:00.000Z"),
  updated_at: new Date("2026-01-01T00:00:00.000Z"),
};

const LLM_JSON = JSON.stringify({
  reply: "Gracias por tu mensaje.",
  capturedLead: null,
  shouldEscalate: false,
});

describe("ChatbotService", () => {
  beforeEach(() => {
    resetChatbotServiceForTests();
    vi.clearAllMocks();
  });

  it("createChatbot upsert", async () => {
    const query = vi.fn().mockResolvedValueOnce([CONFIG_ROW]);
    const svc = new ChatbotService({ db: { query }, llm: { complete: vi.fn() } });
    const c = await svc.createChatbot(USER_ID, {
      name: "Bot",
      greeting: "Hi",
      systemPrompt: "Be helpful",
      captureLeads: true,
      escalateKeywords: ["agente"],
      primaryColor: "#ff0000",
      allowBooking: false,
    });
    expect(c.id).toBe(CHATBOT_ID);
    expect(String(query.mock.calls[0][0])).toContain("chatbot_configs");
  });

  it("getChatbot", async () => {
    const query = vi.fn().mockResolvedValueOnce([CONFIG_ROW]);
    const svc = new ChatbotService({ db: { query }, llm: { complete: vi.fn() } });
    const c = await svc.getChatbot(USER_ID);
    expect(c?.name).toBe("Bot");
  });

  it("chat normal", async () => {
    const query = vi.fn().mockResolvedValue([CONFIG_ROW]);
    const llm = { complete: vi.fn().mockResolvedValue(LLM_JSON) };
    const svc = new ChatbotService({ db: { query }, llm });
    const r = await svc.chat(CHATBOT_ID, "sess", "Hola", []);
    expect(r.response).toContain("Gracias");
    expect(llm.complete).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ temperature: 0.7 }));
  });

  it("chat detecta lead por email", async () => {
    const query = vi.fn().mockResolvedValue([CONFIG_ROW]);
    const llm = { complete: vi.fn().mockResolvedValue(LLM_JSON) };
    const svc = new ChatbotService({ db: { query }, llm });
    const r = await svc.chat(CHATBOT_ID, "sess", "Mi email es ana@acme.com", []);
    expect(r.capturedLead?.email).toBe("ana@acme.com");
  });

  it("chat escalada por keyword", async () => {
    const query = vi.fn().mockResolvedValue([CONFIG_ROW]);
    const llm = { complete: vi.fn().mockResolvedValue(LLM_JSON) };
    const svc = new ChatbotService({ db: { query }, llm });
    const r = await svc.chat(CHATBOT_ID, "sess", "Quiero hablar con un agente humano", []);
    expect(r.shouldEscalate).toBe(true);
  });

  it("saveConversation upsert", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new ChatbotService({
      db: { query },
      llm: { complete: vi.fn() },
    });
    vi.spyOn(svc, "getChatbotById").mockResolvedValue({
      id: CHATBOT_ID,
      userId: USER_ID,
      name: "B",
      greeting: "",
      systemPrompt: "",
      captureLeads: true,
      escalateKeywords: [],
      primaryColor: "#000",
      allowBooking: false,
      theme: "dark",
      createdAt: "",
      updatedAt: "",
    });
    await svc.saveConversation(
      CHATBOT_ID,
      "s1",
      [
        { role: "user", content: "hola" },
        { role: "assistant", content: "ok" },
      ],
      { shouldEscalate: true },
    );
    expect(String(query.mock.calls[0][0])).toContain("INSERT INTO chatbot_conversations");
  });

  it("getConversations", async () => {
    const query = vi.fn().mockResolvedValueOnce([
      {
        id: "1",
        chatbot_id: CHATBOT_ID,
        session_id: "abc",
        messages: [{ role: "user", content: "Hola mundo largo texto" }],
        captured_lead: { email: "x@y.com" },
        escalated: true,
        created_at: new Date("2026-02-01T00:00:00.000Z"),
      },
    ]);
    const svc = new ChatbotService({ db: { query }, llm: { complete: vi.fn() } });
    const list = await svc.getConversations(USER_ID);
    expect(list[0].hasLead).toBe(true);
    expect(list[0].escalated).toBe(true);
  });

  it("getStats", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ total: "2", leads: "1", esc: "1", msg_sum: "8" }]);
    const svc = new ChatbotService({ db: { query }, llm: { complete: vi.fn() } });
    const s = await svc.getStats(USER_ID);
    expect(s.totalConversations).toBe(2);
    expect(s.leadsCaptured).toBe(1);
    expect(s.avgMessagesPerConversation).toBe(4);
  });

  it("generateEmbedCode incluye id y color", async () => {
    const query = vi.fn().mockResolvedValueOnce([CONFIG_ROW]);
    const svc = new ChatbotService({ db: { query }, llm: { complete: vi.fn() } });
    const html = await svc.generateEmbedCode(CHATBOT_ID, "https://app.test");
    expect(html).toContain(CHATBOT_ID);
    expect(html).toContain("https://app.test");
    expect(html).toContain("#ff0000");
  });

  it("getChatbotService singleton", () => {
    resetChatbotServiceForTests();
    expect(getChatbotService()).toBe(getChatbotService());
  });
});
