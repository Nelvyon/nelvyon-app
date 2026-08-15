import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Migración de las capacidades de texto del SaaS fuera de OpenAI.
 *
 * Contrato que se protege:
 *   - funciona sin `OPENAI_API_KEY`;
 *   - CERO tráfico a `api.openai.com`;
 *   - CERO fallback externo automático cuando la IA local falla;
 *   - el `tenantId` real llega al router (aislamiento entre tenants);
 *   - la IA local caída produce degradación explícita, no una llamada externa.
 */
const { executeTaskMock } = vi.hoisted(() => ({ executeTaskMock: vi.fn() }));

vi.mock("../../local-ai/router/LocalModelRouter", () => ({
  executeTask: executeTaskMock,
}));

import { nelvyonTextErrorStatus, runNelvyonTextTask } from "../NelvyonAiTextService";

function okResult(content = "respuesta local") {
  return {
    taskId: "t-1",
    status: "completed",
    content,
    blocked: false,
    requiresApproval: false,
    meta: { finalModel: "llama3.2:3b-instruct-q4_K_M" },
  };
}

describe("NelvyonAiTextService — sin OpenAI", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    executeTaskMock.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    // Espía global: cualquier salida de red durante estas pruebas queda registrada.
    fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("funciona sin OPENAI_API_KEY y devuelve el contenido de la IA local", async () => {
    executeTaskMock.mockResolvedValue(okResult("hola desde NELVYON"));

    const res = await runNelvyonTextTask({ tenantId: "tenant-a", prompt: "hola" });

    expect(process.env.OPENAI_API_KEY).toBeUndefined();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.content).toBe("hola desde NELVYON");
      expect(res.model).toBe("llama3.2:3b-instruct-q4_K_M");
    }
  });

  it("CERO solicitudes a api.openai.com en el camino feliz", async () => {
    executeTaskMock.mockResolvedValue(okResult());

    await runNelvyonTextTask({ tenantId: "tenant-a", prompt: "genera copy" });

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.filter((u) => u.includes("api.openai.com"))).toHaveLength(0);
    expect(urls.filter((u) => u.includes("api.anthropic.com"))).toHaveLength(0);
  });

  it("IA local caída: degradación explícita y NINGUNA llamada externa", async () => {
    executeTaskMock.mockRejectedValue(new Error("PRIVATE_AI_RAG_BLOCKED: ollama down"));

    const res = await runNelvyonTextTask({ tenantId: "tenant-a", prompt: "hola" });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("local_ai_unavailable");
      // El mensaje no invita a configurar ningún proveedor externo.
      expect(res.message).not.toMatch(/openai|anthropic|api key/i);
    }
    // Lo esencial: el fallo NO desencadenó un intento contra un proveedor externo.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no existe fallback externo aunque OPENAI_API_KEY esté presente", async () => {
    process.env.OPENAI_API_KEY = "sk-no-debe-usarse";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    executeTaskMock.mockRejectedValue(new Error("local down"));

    const res = await runNelvyonTextTask({ tenantId: "tenant-a", prompt: "hola" });

    expect(res.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("el tenantId real llega al router", async () => {
    executeTaskMock.mockResolvedValue(okResult());

    await runNelvyonTextTask({ tenantId: "tenant-42", prompt: "x", agentId: "saas-chat" });

    expect(executeTaskMock).toHaveBeenCalledTimes(1);
    const input = executeTaskMock.mock.calls[0]?.[0];
    expect(input.tenantId).toBe("tenant-42");
    expect(input.agentId).toBe("saas-chat");
  });

  it("aislamiento: cada llamada lleva su propio tenant, sin herencia", async () => {
    executeTaskMock.mockResolvedValue(okResult());

    await runNelvyonTextTask({ tenantId: "tenant-A", prompt: "secreto de A" });
    await runNelvyonTextTask({ tenantId: "tenant-B", prompt: "consulta de B" });

    const [a, b] = executeTaskMock.mock.calls.map((c) => c[0]);
    expect(a.tenantId).toBe("tenant-A");
    expect(b.tenantId).toBe("tenant-B");
    // El prompt de B no arrastra nada de A.
    expect(b.query).not.toContain("secreto de A");
  });

  it("tenantId ausente o vacío se rechaza antes de tocar el router", async () => {
    for (const tenantId of ["", "   "]) {
      const res = await runNelvyonTextTask({ tenantId, prompt: "hola" });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("invalid_request");
    }
    expect(executeTaskMock).not.toHaveBeenCalled();
  });

  it("respeta el bloqueo del router (política/riesgo) sin salir fuera", async () => {
    executeTaskMock.mockResolvedValue({
      ...okResult("Acción bloqueada"),
      blocked: true,
      blockReason: "requires_owner_approval",
    });

    const res = await runNelvyonTextTask({ tenantId: "tenant-a", prompt: "borra todo" });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("blocked");
      expect(res.blockReason).toBe("requires_owner_approval");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("respuesta vacía de la IA local se reporta, no se rellena con un tercero", async () => {
    executeTaskMock.mockResolvedValue(okResult("   "));

    const res = await runNelvyonTextTask({ tenantId: "tenant-a", prompt: "hola" });

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("empty_response");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("el system prompt se antepone a la consulta", async () => {
    executeTaskMock.mockResolvedValue(okResult());

    await runNelvyonTextTask({ tenantId: "t", system: "Eres X", prompt: "hola" });

    expect(executeTaskMock.mock.calls[0]?.[0].query).toBe("Eres X\n\nhola");
  });

  it("mapa de códigos HTTP coherente", () => {
    expect(nelvyonTextErrorStatus("invalid_request")).toBe(400);
    expect(nelvyonTextErrorStatus("blocked")).toBe(403);
    expect(nelvyonTextErrorStatus("local_ai_unavailable")).toBe(503);
    expect(nelvyonTextErrorStatus("empty_response")).toBe(503);
  });
});
