/**
 * LA PROCEDENCIA NO SE FINGE.
 *
 * El defecto que estas pruebas existen para impedir está medido en producción,
 * no supuesto: `os_agent_audit_events` tiene 14.178 filas entre el 29 de junio
 * y el 22 de julio de 2026, y las 14.178 dicen `model = 'mock-rules-v1'` con
 * `tokens = 0`. Ninguna dice `llm_mode = 'real'`. Todo el trabajo entregado en
 * ese periodo lo generó un motor de reglas, y 3.252 entregables fueron
 * aprobados por clientes que creían estar comprando trabajo hecho con IA.
 *
 * Lo que lo hizo posible no fue que el modelo estuviera caído —eso pasa—, sino
 * que la degradación era INDISTINGUIBLE del éxito: `mockFallback` registraba
 * `ok: true`, devolvía `mode: "mock"` igual que un generador determinista
 * correcto, y nada aguas abajo miraba.
 *
 * Cada prueba de aquí abajo mata una de las formas de volver a eso.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatMock = vi.fn();

vi.mock("../../../local-ai/OllamaClient", () => ({
  getOllamaClient: () => ({ chat: chatMock }),
  OllamaClient: class {
    chat = chatMock;
  },
}));

import {
  LlmSinModeloRealError,
  invokeLlm,
  resolveLlmMode,
  setLlmInvokeForTests,
} from "../llmAdapter";
import {
  ContadorDeEjecucion,
  LlmLimiteExcedidoError,
  conContadorDeEjecucion,
  esperaDeReintento,
  limpiarContadorParaPruebas,
  resolverLimitesLlm,
} from "../llmLimits";
import {
  degradacionPermitida,
  recuentoPorEstado,
  veredictoDeEntrega,
  veredictoDeEntregaDelConjunto,
} from "../llmPolicy";
import {
  LLM_OUTCOMES,
  type LlmProvenance,
  clasificarErrorDeProveedor,
  esDegradacion,
  esPublicable,
  procedenciaDeMotorDeReglas,
} from "../llmProvenance";
import { estimarCosteUsd } from "../providers/pricing";

const PETICION = {
  agentId: "agent-copywriter-landing" as const,
  payload: { brief: "x" },
  mockGenerator: () => ({ headline: "de reglas" }),
};

/** Procedencia mínima para probar la política sin pasar por el adaptador. */
function procedencia(parcial: Partial<LlmProvenance>): LlmProvenance {
  return {
    outcome: "REAL_LLM_SUCCESS",
    provider: "ollama",
    model: "llama3.2",
    tokensIn: 10,
    tokensOut: 20,
    costEstimateUsd: 0,
    latencyMs: 5,
    retries: 0,
    fallbackFrom: null,
    errorKind: null,
    degradationAllowed: false,
    reason: "",
    ...parcial,
  };
}

/** Respuesta válida de Ollama. */
function respuestaOk(json: unknown, promptTokens = 100, evalTokens = 250) {
  return {
    content: JSON.stringify(json),
    promptEvalCount: promptTokens,
    evalCount: evalTokens,
    model: "llama3.2:3b-instruct-q4_K_M",
  };
}

function limpiarEntorno(): void {
  vi.unstubAllEnvs();
  for (const v of [
    "AUTONOMOUS_LLM_MODE",
    "OLLAMA_CONFIGURED",
    "OLLAMA_HOST",
    "OLLAMA_BASE_URL",
    "NELVYON_LOCAL_AI_URL",
    "LOCAL_AI_BASE_URL",
    "OPENAI_API_KEY",
    "AUTONOMOUS_ALLOW_OPENAI",
    "AUTONOMOUS_QUALITY_ROUTING",
    "NELVYON_LLM_ALLOW_DEGRADATION",
    "NELVYON_LLM_MAX_RETRIES",
    "NELVYON_LLM_MAX_CALLS_PER_RUN",
    "NELVYON_LLM_MAX_TOKENS_PER_RUN",
    "NELVYON_LLM_MAX_COST_PER_RUN_USD",
    "NELVYON_LLM_PRICE_OVERRIDES",
  ]) {
    vi.stubEnv(v, "");
    delete process.env[v];
  }
}

beforeEach(() => {
  setLlmInvokeForTests(null);
  limpiarContadorParaPruebas();
  chatMock.mockReset();
  limpiarEntorno();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  limpiarContadorParaPruebas();
});

// ═══════════════════════════════════════════════════════════════════════════
describe("los cinco estados son cerrados y distintos", () => {
  it("son exactamente cinco", () => {
    expect([...LLM_OUTCOMES].sort()).toEqual(
      ["ERROR", "FALLBACK", "MOCK", "REAL_LLM_SUCCESS", "RULE_ENGINE"].sort(),
    );
  });

  it("un motor de reglas por diseño NO es una degradación", () => {
    // Esta distinción es la que faltaba: `llmChatbotConfig` calcula la
    // configuración del bot, no la redacta. Tratarlo como degradación
    // impediría entregar un bot correcto.
    expect(esDegradacion("RULE_ENGINE")).toBe(false);
    expect(esDegradacion("MOCK")).toBe(true);
    expect(esDegradacion("FALLBACK")).toBe(true);
  });

  it("ERROR nunca es publicable, ni con la degradación permitida", () => {
    expect(esPublicable(procedencia({ outcome: "ERROR", degradationAllowed: true }))).toBe(false);
  });

  it("MOCK y FALLBACK sólo son publicables si la degradación estaba permitida", () => {
    for (const o of ["MOCK", "FALLBACK"] as const) {
      expect(esPublicable(procedencia({ outcome: o, degradationAllowed: false }))).toBe(false);
      expect(esPublicable(procedencia({ outcome: o, degradationAllowed: true }))).toBe(true);
    }
  });

  it("RULE_ENGINE es publicable aunque la degradación esté prohibida", () => {
    expect(esPublicable(procedenciaDeMotorDeReglas("mock-rules-v1", 1))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("la política decide, y por defecto dice que no", () => {
  it("un servicio vendible NO admite degradación", () => {
    // `seo_premium` está en OS_PREMIUM_SERVICE_IDS: alguien lo ha pagado.
    expect(degradacionPermitida({ serviceId: "seo_premium" })).toBe(false);
  });

  it("un pack sectorial tampoco", () => {
    expect(degradacionPermitida({ packId: "pack-dental-v1" })).toBe(false);
  });

  it("sin contexto NINGUNO se falla cerrado", () => {
    // No poder demostrar que es interno no es lo mismo que demostrar que lo es.
    expect(degradacionPermitida({})).toBe(false);
  });

  it("el trabajo interno sí, porque no llega a ningún cliente", () => {
    expect(degradacionPermitida({ serviceId: "seo_premium", interno: true })).toBe(true);
  });

  it("el permiso explícito de entorno la habilita, y sólo el valor exacto", () => {
    vi.stubEnv("NELVYON_LLM_ALLOW_DEGRADATION", "1");
    expect(degradacionPermitida({ serviceId: "seo_premium" })).toBe(true);

    // "true", "yes" o " 1 " NO valen: un permiso ambiguo no es un permiso.
    for (const valor of ["true", "yes", "0", "sí"]) {
      vi.stubEnv("NELVYON_LLM_ALLOW_DEGRADATION", valor);
      expect(
        degradacionPermitida({ serviceId: "seo_premium" }),
        `"${valor}" no debería habilitar la degradación`,
      ).toBe(false);
    }
  });

  it("un solo agente degradado tumba el entregable entero", () => {
    const conjunto = [
      procedencia({ outcome: "REAL_LLM_SUCCESS" }),
      procedencia({ outcome: "REAL_LLM_SUCCESS" }),
      procedencia({ outcome: "FALLBACK", degradationAllowed: false, reason: "ollama caído" }),
      procedencia({ outcome: "REAL_LLM_SUCCESS" }),
    ];
    const v = veredictoDeEntregaDelConjunto(conjunto);
    expect(v.publicable).toBe(false);
    if (!v.publicable) {
      expect(v.outcome).toBe("FALLBACK");
      expect(v.motivo).toContain("ollama caído");
    }
    expect(recuentoPorEstado(conjunto)).toEqual({
      REAL_LLM_SUCCESS: 3,
      RULE_ENGINE: 0,
      MOCK: 0,
      FALLBACK: 1,
      ERROR: 0,
    });
  });

  it("el veredicto explica POR QUÉ, no sólo que no", () => {
    const v = veredictoDeEntrega(
      procedencia({ outcome: "ERROR", errorKind: "unreachable", reason: "ECONNREFUSED" }),
    );
    expect(v.publicable).toBe(false);
    if (!v.publicable) {
      expect(v.motivo).toContain("unreachable");
      expect(v.motivo).toContain("ECONNREFUSED");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("el adaptador registra lo que pasó de verdad", () => {
  it("sin proveedor: FALLBACK con causa, NO un éxito", async () => {
    const r = await invokeLlm(PETICION);
    expect(r.provenance.outcome).toBe("FALLBACK");
    expect(r.provenance.errorKind).toBe("not_configured");
    expect(r.provenance.provider).toBe("none");
    expect(r.mode).toBe("mock");
  });

  it("modo mock explícito es MOCK, que NO es lo mismo que FALLBACK", async () => {
    // Antes los dos se registraban idénticos. Distinguirlos es lo que permite
    // saber si un `mock` en la auditoría fue una decisión o una avería.
    vi.stubEnv("AUTONOMOUS_LLM_MODE", "mock");
    const r = await invokeLlm(PETICION);
    expect(r.provenance.outcome).toBe("MOCK");
    expect(r.provenance.errorKind).toBeNull();
  });

  it("un generador determinista se marca RULE_ENGINE", async () => {
    const r = await invokeLlm({ ...PETICION, ruleEngine: true });
    expect(r.provenance.outcome).toBe("RULE_ENGINE");
    expect(esPublicable(r.provenance)).toBe(true);
  });

  it("EL CONTROL POSITIVO: con Ollama respondiendo es REAL_LLM_SUCCESS", async () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    chatMock.mockResolvedValue(respuestaOk({ headline: "de un modelo" }, 120, 300));

    const r = await invokeLlm(PETICION);
    expect(r.provenance.outcome).toBe("REAL_LLM_SUCCESS");
    expect(r.provenance.provider).toBe("ollama");
    expect(r.mode).toBe("real");
    // Los tokens dejan de ser un solo número: entrada y salida por separado.
    expect(r.provenance.tokensIn).toBe(120);
    expect(r.provenance.tokensOut).toBe(300);
    expect(r.tokens).toBe(420);
    // Un modelo local cuesta 0, que NO es lo mismo que "no sé cuánto cuesta".
    expect(r.provenance.costEstimateUsd).toBe(0);
    expect(r.parsed).toEqual({ headline: "de un modelo" });
  });

  it("mide latencia y reintentos", async () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    vi.stubEnv("NELVYON_LLM_MAX_RETRIES", "1");
    chatMock
      .mockResolvedValueOnce({ content: "esto no es json", model: "m" })
      .mockResolvedValueOnce(respuestaOk({ ok: 1 }));

    const r = await invokeLlm(PETICION);
    expect(r.provenance.outcome).toBe("REAL_LLM_SUCCESS");
    expect(r.provenance.retries).toBe(1);
    expect(r.provenance.latencyMs).toBeGreaterThanOrEqual(0);
    expect(chatMock).toHaveBeenCalledTimes(2);
  });

  it("EL NEGATIVO QUE IMPORTA: una degradación NO se registra como ok=true", async () => {
    // Ésta es la regresión exacta de producción. `mockFallback` registraba
    // `ok: true` y por eso 14.178 eventos de reglas parecían correctos.
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    await invokeLlm(PETICION);
    const lineas = espia.mock.calls.map((c) => String(c[0]));
    const linea = lineas.find((l) => l.includes("[autonomous-llm]"));
    expect(linea, "no se registró ninguna línea de auditoría").toBeDefined();
    expect(linea).toContain("ok=false");
    expect(linea).toContain("outcome=FALLBACK");
  });

  it("un motor de reglas SÍ se registra como ok=true: no es una avería", async () => {
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    await invokeLlm({ ...PETICION, ruleEngine: true });
    const linea = espia.mock.calls.map((c) => String(c[0])).find((l) => l.includes("[autonomous-llm]"));
    expect(linea).toContain("ok=true");
    expect(linea).toContain("outcome=RULE_ENGINE");
  });

  it("el registro NUNCA contiene el prompt ni el payload", async () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    chatMock.mockResolvedValue(respuestaOk({ ok: 1 }));
    const espia = vi.spyOn(console, "error").mockImplementation(() => {});
    await invokeLlm({
      ...PETICION,
      payload: { secreto_del_cliente: "NO-DEBE-APARECER-NUNCA" },
    });
    for (const c of espia.mock.calls) {
      expect(String(c[0])).not.toContain("NO-DEBE-APARECER-NUNCA");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("cuando el trabajo exige IA real, se falla cerrado", () => {
  it("sin proveedor lanza en vez de devolver reglas", async () => {
    await expect(invokeLlm({ ...PETICION, requiereIaReal: true })).rejects.toThrow(
      LlmSinModeloRealError,
    );
  });

  it("con AUTONOMOUS_LLM_MODE=mock también lanza", async () => {
    vi.stubEnv("AUTONOMOUS_LLM_MODE", "mock");
    await expect(invokeLlm({ ...PETICION, requiereIaReal: true })).rejects.toThrow(
      LlmSinModeloRealError,
    );
  });

  it("el error lleva la procedencia, para poder escalar con causa", async () => {
    try {
      await invokeLlm({ ...PETICION, requiereIaReal: true });
      throw new Error("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(LlmSinModeloRealError);
      const p = (err as LlmSinModeloRealError).provenance;
      expect(p.outcome).toBe("ERROR");
      expect(p.errorKind).toBe("not_configured");
      expect(esPublicable(p)).toBe(false);
    }
  });

  it("SE CONSERVA el fail-closed: con Ollama configurado y caído, nunca mock silencioso", async () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    chatMock.mockRejectedValue(new Error("connect ECONNREFUSED 100.102.207.30:11434"));
    // Sin `requiereIaReal`: el fail-closed no depende de que nadie se acuerde.
    await expect(invokeLlm(PETICION)).rejects.toThrow(/no silent mock/);
  });

  it("EL CONTROL: sin Ollama configurado, ese mismo fallo NO lanza", async () => {
    // Demuestra que el fail-closed anterior lo dispara la configuración de
    // Ollama y no simplemente que haya habido un error.
    const r = await invokeLlm(PETICION);
    expect(r.provenance.outcome).toBe("FALLBACK");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("los límites muerden", () => {
  it("el tope de llamadas por ejecución corta antes de gastar", async () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    vi.stubEnv("NELVYON_LLM_MAX_CALLS_PER_RUN", "2");
    chatMock.mockResolvedValue(respuestaOk({ ok: 1 }));

    const contador = new ContadorDeEjecucion(resolverLimitesLlm());
    await conContadorDeEjecucion(contador, async () => {
      await invokeLlm(PETICION);
      await invokeLlm(PETICION);
      await expect(invokeLlm(PETICION)).rejects.toThrow(LlmLimiteExcedidoError);
    });
    expect(contador.estado().llamadas).toBe(2);
  });

  it("el tope de tokens muerde", () => {
    vi.stubEnv("NELVYON_LLM_MAX_TOKENS_PER_RUN", "1000");
    const c = new ContadorDeEjecucion(resolverLimitesLlm());
    c.anotarConsumo(600, 0);
    expect(() => c.anotarConsumo(600, 0)).toThrow(LlmLimiteExcedidoError);
  });

  it("el tope de coste muerde", () => {
    vi.stubEnv("NELVYON_LLM_MAX_COST_PER_RUN_USD", "0.5");
    const c = new ContadorDeEjecucion(resolverLimitesLlm());
    c.anotarConsumo(100, 0.3);
    expect(() => c.anotarConsumo(100, 0.3)).toThrow(LlmLimiteExcedidoError);
  });

  it("un valor de entorno inválido usa el defecto, NO deja el tope en infinito", () => {
    for (const basura of ["", "  ", "abc", "-5", "NaN"]) {
      vi.stubEnv("NELVYON_LLM_MAX_CALLS_PER_RUN", basura);
      expect(resolverLimitesLlm().maxCallsPerRun, `"${basura}"`).toBe(60);
    }
  });

  it("un límite excedido NO se reintenta: insistir es lo que el tope impide", async () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    vi.stubEnv("NELVYON_LLM_MAX_CALLS_PER_RUN", "1");
    vi.stubEnv("NELVYON_LLM_MAX_RETRIES", "5");
    chatMock.mockResolvedValue({ content: "no json", model: "m" });

    const contador = new ContadorDeEjecucion(resolverLimitesLlm());
    await conContadorDeEjecucion(contador, async () => {
      await expect(invokeLlm(PETICION)).rejects.toThrow(LlmLimiteExcedidoError);
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("la espera de reintento crece y tiene tope", () => {
    vi.stubEnv("NELVYON_LLM_RETRY_BASE_MS", "100");
    vi.stubEnv("NELVYON_LLM_RETRY_MAX_MS", "500");
    const l = resolverLimitesLlm();
    expect(esperaDeReintento(1, l)).toBe(100);
    expect(esperaDeReintento(2, l)).toBe(200);
    expect(esperaDeReintento(3, l)).toBe(400);
    expect(esperaDeReintento(9, l)).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("el coste se estima sin llamar a nadie", () => {
  it("un modelo local vale 0", () => {
    expect(estimarCosteUsd("ollama", "llama3.1:8b", 1_000_000, 1_000_000)).toBe(0);
  });

  it("un modelo desconocido vale null, NO cero", () => {
    // Confundir "no lo sé" con "es gratis" es cómo se acaba con un tope que
    // nunca muerde por mucho que se gaste.
    expect(estimarCosteUsd("openai", "modelo-que-no-existe", 1000, 1000)).toBeNull();
  });

  it("un modelo con tarifa conocida se calcula", () => {
    // 1M entrada a 0,15 + 1M salida a 0,60.
    expect(estimarCosteUsd("openai", "gpt-4o-mini", 1_000_000, 1_000_000)).toBeCloseTo(0.75, 6);
  });

  it("las tarifas se pueden corregir sin tocar código", () => {
    vi.stubEnv("NELVYON_LLM_PRICE_OVERRIDES", "modelo-nuevo:1:2");
    expect(estimarCosteUsd("openai", "modelo-nuevo", 1_000_000, 1_000_000)).toBeCloseTo(3, 6);
  });

  it("un override mal escrito se ignora, no rompe ni miente", () => {
    vi.stubEnv("NELVYON_LLM_PRICE_OVERRIDES", "roto,otro:abc:1,x:-1:2");
    expect(estimarCosteUsd("openai", "roto", 1000, 1000)).toBeNull();
    expect(estimarCosteUsd("openai", "otro", 1000, 1000)).toBeNull();
    expect(estimarCosteUsd("openai", "x", 1000, 1000)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("los errores se clasifican para saber qué reintentar", () => {
  it.each([
    ["connect ECONNREFUSED 100.102.207.30:11434", "unreachable"],
    ["fetch failed", "unreachable"],
    ["The operation was aborted", "timeout"],
    ["OpenAI HTTP 401: invalid api key", "auth"],
    ["OpenAI HTTP 429: rate limit", "rate_limit"],
    ["Ollama empty content", "empty_response"],
    ["response is not valid JSON object", "bad_json"],
    ["OPENAI_API_KEY missing", "not_configured"],
  ])("%s → %s", (mensaje, esperado) => {
    expect(clasificarErrorDeProveedor(new Error(mensaje))).toBe(esperado);
  });

  it("lo que no se reconoce es 'unknown', no se adivina", () => {
    expect(clasificarErrorDeProveedor(new Error("algo rarísimo"))).toBe("unknown");
    expect(clasificarErrorDeProveedor(null)).toBe("unknown");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("resolveLlmMode sigue diciendo la verdad", () => {
  it("sin proveedores disponibles es mock", () => {
    expect(resolveLlmMode()).toBe("mock");
  });

  it("una clave de OpenAI SIN permiso NO lo pone en real", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-lo-que-sea");
    expect(resolveLlmMode()).toBe("mock");
  });

  it("con Ollama configurado es real", () => {
    vi.stubEnv("OLLAMA_HOST", "http://127.0.0.1:11434");
    expect(resolveLlmMode()).toBe("real");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("la puerta sigue enchufada al orquestador", () => {
  /**
   * Una puerta que existe y nadie llama es exactamente donde estabamos: el
   * fail-closed del adaptador llevaba en el arbol desde el 23 de julio y aun
   * asi nada impedia certificar un entregable de plantilla, porque la decision
   * de publicar no consultaba la procedencia.
   *
   * Esta prueba es estructural a proposito. Lo que vigila no es un calculo
   * —eso ya lo cubren las pruebas de arriba— sino que el cableado no se caiga.
   */
  /**
   * `import.meta.url` bajo Vite no es un `file:`, asi que se resuelve desde el
   * directorio de trabajo, que es la raiz de la configuracion de Vitest
   * (`apps/web`). Si el fichero cambiara de sitio, esta prueba falla con un
   * mensaje que lo dice — que es justo lo que debe hacer.
   */
  const ORQUESTADOR = resolve(process.cwd(), "src/lib/packs/packOrchestrator.ts");

  function fuente(): string {
    if (!existsSync(ORQUESTADOR)) {
      throw new Error(
        `no se encuentra el orquestador en ${ORQUESTADOR}; si se ha movido, actualiza esta prueba`,
      );
    }
    return readFileSync(ORQUESTADOR, "utf8");
  }

  it("la decision de publicar consulta el veredicto de procedencia", () => {
    const s = fuente();
    expect(s).toContain("veredictoDeEntregaDelConjunto");
    expect(s).toContain("degradacionPermitida");
    // No basta con importarlo: tiene que MANDAR sobre `shouldPublish`.
    expect(s).toMatch(/const shouldPublish\s*=\s*\n?\s*!bloqueoProcedencia/);
  });

  it("un bloqueo manda la ejecucion a revision humana", () => {
    const s = fuente();
    expect(s).toMatch(/const needsReview\s*=[^;]*bloqueoDeProcedencia/);
  });

  it("el bloqueo viaja en el resultado del SKU, no se pierde", () => {
    const s = fuente();
    expect(s).toContain("provenance_block: bloqueoProcedencia");
    expect(s).toContain("provenance_counts: conteoProcedencia");
  });
});
