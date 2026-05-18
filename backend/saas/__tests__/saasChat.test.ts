import { describe, expect, it, vi } from "vitest";

import { SaasChatService, saasChatService, type ChatMessage } from "../SaasChatService";

const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "00000000-0000-0000-0000-000000000001",
  userId: "u1",
  tenantId: "00000000-0000-0000-0000-0000000000aa",
  role: "user",
  content: "hola",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("SaasChatService", () => {
  it("getHistory devuelve mensajes ordenados ASC", async () => {
    const query = vi.fn().mockResolvedValue([msg(), msg({ id: "2", createdAt: "2026-01-01T00:00:01.000Z" })]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn() } });
    const out = await svc.getHistory("u1", "t1", 50);
    expect(out).toHaveLength(2);
    expect(String(query.mock.calls[0]?.[0])).toContain("ORDER BY created_at ASC");
  });

  it("getHistory respeta límite máximo 100", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn() } });
    await svc.getHistory("u1", "t1", 999);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", "t1", 100]);
  });

  it("sendMessage guarda mensaje user + respuesta assistant", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([msg({ role: "user", content: "estado?" })]) // user insert
      .mockResolvedValueOnce([{ service_id: "seo_premium", status: "active" }]) // context
      .mockResolvedValueOnce([msg({ role: "user", content: "anterior 1" }), msg({ role: "assistant", content: "anterior 2" })]) // history
      .mockResolvedValueOnce([msg({ id: "2", role: "assistant", content: "Todo en marcha" })]); // assistant insert
    const complete = vi.fn().mockResolvedValue("Todo en marcha");
    const svc = new SaasChatService({ db: { query }, llm: { complete } });
    const out = await svc.sendMessage("u1", "00000000-0000-0000-0000-0000000000aa", "estado?");
    expect(out.userMessage.role).toBe("user");
    expect(out.assistantMessage.role).toBe("assistant");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("sendMessage construye prompt con contexto de servicios activos", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([msg({ role: "user", content: "hola" })])
      .mockResolvedValueOnce([{ service_id: "ads_premium", status: "active" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([msg({ role: "assistant", content: "ok" })]);
    const complete = vi.fn().mockResolvedValue("ok");
    const svc = new SaasChatService({ db: { query }, llm: { complete } });
    await svc.sendMessage("u1", "00000000-0000-0000-0000-0000000000aa", "hola");
    const prompt = String(complete.mock.calls[0]?.[0] ?? "");
    expect(prompt).toContain("ads_premium (active)");
  });

  it("sendMessage incluye historial previo en el contexto LLM", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([msg({ role: "user", content: "nueva pregunta" })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        msg({ role: "user", content: "mensaje viejo A" }),
        msg({ role: "assistant", content: "mensaje viejo B" }),
      ])
      .mockResolvedValueOnce([msg({ role: "assistant", content: "respuesta" })]);
    const complete = vi.fn().mockResolvedValue("respuesta");
    const svc = new SaasChatService({ db: { query }, llm: { complete } });
    await svc.sendMessage("u1", "00000000-0000-0000-0000-0000000000aa", "nueva pregunta");
    const prompt = String(complete.mock.calls[0]?.[0] ?? "");
    expect(prompt).toContain("USER: mensaje viejo A");
    expect(prompt).toContain("ASSISTANT: mensaje viejo B");
  });

  it("sendMessage lanza si user insert no devuelve fila", async () => {
    const query = vi.fn().mockResolvedValueOnce([]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn() } });
    await expect(svc.sendMessage("u1", "00000000-0000-0000-0000-0000000000aa", "hola")).rejects.toThrow("user insert");
  });

  it("sendMessage lanza si assistant insert no devuelve fila", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([msg({ role: "user", content: "hola" })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn().mockResolvedValue("ok") } });
    await expect(svc.sendMessage("u1", "00000000-0000-0000-0000-0000000000aa", "hola")).rejects.toThrow("assistant insert");
  });

  it("clearHistory elimina todos los mensajes y devuelve count", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn() } });
    const deleted = await svc.clearHistory("u1", "t1");
    expect(deleted).toBe(2);
  });

  it("clearHistory con historial vacío devuelve 0", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn() } });
    const deleted = await svc.clearHistory("u1", "t1");
    expect(deleted).toBe(0);
  });

  it("getHistory acota límite mínimo a 1", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn() } });
    await svc.getHistory("u1", "t1", 0);
    expect(query.mock.calls[0]?.[1]).toEqual(["u1", "t1", 1]);
  });

  it("sendMessage consulta contexto en os_service_contracts", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([msg({ role: "user", content: "x" })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([msg({ role: "assistant", content: "y" })]);
    const svc = new SaasChatService({ db: { query }, llm: { complete: vi.fn().mockResolvedValue("y") } });
    await svc.sendMessage("u1", "00000000-0000-0000-0000-0000000000aa", "x");
    expect(String(query.mock.calls[1]?.[0])).toContain("FROM os_service_contracts");
  });

  it("saasChatService singleton es instancia de SaasChatService", () => {
    expect(saasChatService).toBeInstanceOf(SaasChatService);
  });
});
