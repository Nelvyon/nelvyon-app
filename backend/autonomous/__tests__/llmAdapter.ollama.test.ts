import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();

vi.mock("../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock }),
  OllamaClient: class {
    chat = chatMock;
  },
}));

import {
  invokeLlm,
  isAutonomousOpenAiAllowed,
  resolveLlmMode,
  setLlmInvokeForTests,
} from "../llm/llmAdapter";

describe("llmAdapter — Ollama-first real path", () => {
  beforeEach(() => {
    setLlmInvokeForTests(null);
    chatMock.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.AUTONOMOUS_LLM_MODE;
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.PRIVATE_MODE;
    delete process.env.NELVYON_PRIVATE_MODE;
    delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
  });

  afterEach(() => {
    setLlmInvokeForTests(null);
    vi.unstubAllGlobals();
  });

  it("prefers Ollama over OpenAI when both configured", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test-should-not-call";
    // El interruptor maestro va explicito: `NELVYON_AI_ENABLED` esta APAGADO
    // por defecto y ahora manda por encima de `AUTONOMOUS_ALLOW_OPENAI`, de la
    // clave y de todo lo demas. Esta prueba ejercita a proposito el camino de
    // pago, asi que tiene que encenderlo — y al escribirlo aqui queda a la vista
    // que hacen falta las DOS condiciones, no solo el opt-in de siempre.
    process.env.NELVYON_AI_ENABLED = "1";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
    expect(resolveLlmMode()).toBe("real");

    chatMock.mockResolvedValue({
      content: JSON.stringify({ template_id: "from-ollama", blockers: [] }),
      model: "llama-local",
      evalCount: 10,
      promptEvalCount: 5,
      truncated: false,
    });

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ template_id: "from-mock", blockers: ["x"] }),
    });

    expect(res.mode).toBe("real");
    expect(res.model).toBe("llama-local");
    expect((res.parsed as { template_id: string }).template_id).toBe("from-ollama");
    expect(chatMock).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not auto-fallback to OpenAI when Ollama fails (key alone is not enough)", async () => {
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    // AUTONOMOUS_ALLOW_OPENAI unset → OpenAI must stay OFF
    // Product contract: fail-closed (no silent mock) when Ollama is configured and fails.
    chatMock.mockRejectedValue(new Error("ollama down"));

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      invokeLlm({
        agentId: "agent-pm-landing",
        payload: {},
        mockGenerator: () => ({ template_id: "from-mock", blockers: [] }),
      }),
    ).rejects.toThrow(/LLM Ollama failed \(no silent mock\)/);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(isAutonomousOpenAiAllowed()).toBe(false);
  });

  it("uses OpenAI only with explicit AUTONOMOUS_ALLOW_OPENAI=1 and PRIVATE_MODE off", async () => {
    // AHORA HAY DOS CERROJOS, NO UNO, y este caso sólo prueba el primero.
    //
    // `AUTONOMOUS_ALLOW_OPENAI` es un permiso POR PROVEEDOR: hay que acordarse
    // de apagarlo uno a uno, y el proveedor que se añada mañana nace permitido
    // si nadie se acuerda. El modo de coste cero va al revés — la regla es
    // general y el proveedor tiene que demostrar que no cuesta.
    //
    // Aquí se apaga el segundo para poder comprobar el primero. La prueba de
    // debajo comprueba el segundo con el primero abierto del todo.
    process.env.NELVYON_MODO_COSTE_CERO = "0";
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
    chatMock.mockRejectedValue(new Error("ollama down"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ template_id: "from-openai", blockers: [] }) } }],
          usage: { total_tokens: 12 },
          model: "gpt-4o-mini",
        }),
        text: async () => "",
      }),
    );

    const res = await invokeLlm({
      agentId: "agent-pm-landing",
      payload: {},
      mockGenerator: () => ({ template_id: "from-mock", blockers: ["x"] }),
    });

    expect(res.mode).toBe("real");
    expect(res.model).toBe("gpt-4o-mini");
    expect((res.parsed as { template_id: string }).template_id).toBe("from-openai");
  });

  it("EL SEGUNDO CERROJO: con el modo de coste cero, NO usa OpenAI aunque esté permitido", async () => {
    // El permiso está abierto del todo —clave puesta, permiso a 1, modo privado
    // apagado— y Ollama caído, que es la situación exacta en la que antes se
    // caía a OpenAI. Con el modo encendido no se cae: se queda sin proveedor.
    //
    // Es lo que impide que un despiste de configuración se convierta en una
    // factura por tokens.
    delete process.env.NELVYON_MODO_COSTE_CERO;
    process.env.OLLAMA_CONFIGURED = "1";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
    process.env.PRIVATE_MODE = "OFF";
    chatMock.mockRejectedValue(new Error("ollama down"));

    const llamadasHttp = vi.fn();
    vi.stubGlobal("fetch", llamadasHttp);

    // Y falla, que es lo correcto: sin Ollama y sin poder pagar, no hay
    // modelo. Fallar es la respuesta honesta; caer a un proveedor de pago
    // sería resolver el problema con dinero de otro sin preguntarle.
    await expect(
      invokeLlm({
        agentId: "agent-pm-landing",
        payload: {},
        mockGenerator: () => ({ template_id: "from-mock", blockers: ["x"] }),
      }),
    ).rejects.toThrow(/Ollama failed/);

    // Ni una llamada a OpenAI. No es que fallara: es que no se intentó.
    expect(llamadasHttp, "se ha llamado a OpenAI con el modo de coste cero puesto").not.toHaveBeenCalled();
  });
});
