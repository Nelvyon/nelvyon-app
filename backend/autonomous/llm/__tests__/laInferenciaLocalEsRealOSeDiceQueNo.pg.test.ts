/**
 * ¿NELVYON AI INFIERE DE VERDAD? SE MIDE, NO SE SUPONE.
 *
 * DE DÓNDE VIENE ESTA PRUEBA. Todos los informes de este proyecto vienen
 * diciendo «NELVYON AI: inferencia UNAVAILABLE», y era lo correcto: nadie lo
 * había comprobado. Pero «nadie lo ha comprobado» y «no se puede» no son la
 * misma frase, y llevaban meses escribiéndose igual.
 *
 * En esta máquina hay un Ollama corriendo con `llama3.1:8b-instruct-q4_K_M`.
 * Eso NO es un proveedor de pago, no sale del perímetro y cuesta 0 €. Si el
 * camino real funciona de punta a punta, la respuesta honesta deja de ser
 * «no disponible» y pasa a ser «disponible en local, medido».
 *
 * QUÉ SE MIDE, Y POR QUÉ ASÍ. Producción tiene 14.178 eventos de agente que
 * dicen `ok: true` con cero modelo y cero tokens. Es exactamente el motivo por
 * el que aquí no basta con que la llamada no reviente:
 *
 *   - la procedencia tiene que decir `REAL_LLM_SUCCESS`, no `MOCK`, no
 *     `FALLBACK` y desde luego no `RULE_ENGINE`;
 *   - los tokens tienen que ser DE VERDAD. Un `tok_in: 1` es el aspecto que
 *     tiene un doble de pruebas, no el de un modelo de ocho mil millones de
 *     parámetros leyendo un prompt;
 *   - el coste tiene que ser 0, porque es local. Si aparece coste, se está
 *     hablando con alguien a quien hay que pagar.
 *
 * SI NO HAY OLLAMA, ESTA PRUEBA SE SALTA. No falla: no hay nada roto en un
 * portátil sin modelo instalado. Lo que no hace es dar por bueno el camino
 * real sin haberlo recorrido.
 *
 * COSTE EXTERNO: 0 €. Todo ocurre contra 127.0.0.1.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..", "..", "..", "..");
const BASE = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";

/** Modelos instalados, o `null` si no hay nadie escuchando. */
async function modelosInstalados(): Promise<string[] | null> {
  try {
    const r = await fetch(`${BASE}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { models?: Array<{ name?: string }> };
    return (j.models ?? []).map((m) => m.name ?? "").filter(Boolean);
  } catch {
    return null;
  }
}

const modelos = await modelosInstalados();
const hayModelo = Array.isArray(modelos) && modelos.length > 0;
const conModelo = hayModelo ? describe : describe.skip;

/** El de instrucciones más grande que haya, que es el que se usaría de verdad. */
const MODELO =
  modelos?.find((m) => /instruct/i.test(m) && /8b|7b|13b/i.test(m)) ??
  modelos?.find((m) => !/embed/i.test(m)) ??
  "";

const antes: Record<string, string | undefined> = {};
function poner(clave: string, valor: string): void {
  antes[clave] = process.env[clave];
  process.env[clave] = valor;
}

describe("se sabe si hay un modelo local, y se dice cuál", () => {
  it("deja constancia de lo que hay en esta máquina", () => {
    // Se escribe pase lo que pase: «no hay modelo» es un resultado, y es el que
    // justifica que todo lo demás siga en UNAVAILABLE.
    const evidencia = {
      _lee_esto: [
        "Lo escribe laInferenciaLocalEsRealOSeDiceQueNo. No se edita a mano.",
        "modeloDisponible=false NO significa que NELVYON AI no funcione: significa",
        "que en la maquina donde se ejecuto esto no habia ningun modelo instalado.",
      ],
      medidoEn: new Date().toISOString().slice(0, 10),
      base: BASE,
      modeloDisponible: hayModelo,
      modelosInstalados: modelos ?? [],
      modeloElegido: MODELO || null,
      costeExternoEuros: 0,
    };
    fs.mkdirSync(path.join(RAIZ, "docs", "evidence"), { recursive: true });
    fs.writeFileSync(
      path.join(RAIZ, "docs", "evidence", "inferencia_local.json"),
      `${JSON.stringify(evidencia, null, 2)}\n`,
      "utf8",
    );
    expect(typeof hayModelo).toBe("boolean");
  });
});

conModelo("la inferencia local es real, y la procedencia lo demuestra", () => {
  beforeAll(() => {
    poner("OLLAMA_HOST", BASE);
    poner("OLLAMA_MODEL", MODELO);
    poner("AUTONOMOUS_LLM_MODE", "real");
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(antes)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("el adaptador reconoce que hay camino real", async () => {
    const { isAutonomousOllamaConfigured, resolveLlmMode } = await import("../llmAdapter");
    expect(isAutonomousOllamaConfigured(), "hay Ollama y el adaptador no lo ve").toBe(true);
    expect(resolveLlmMode()).toBe("real");
  });

  it(
    "LA MEDIDA: una llamada real vuelve con procedencia real y tokens de verdad",
    async () => {
      const { invokeLlm } = await import("../llmAdapter");

      const r = await invokeLlm({
        agentId: "agent-copywriter-landing",
        payload: {
          brief: {
            negocio: "clínica dental de barrio",
            ciudad: "Valencia",
            objetivo: "más primeras visitas",
          },
          template_id: "dental-01",
          tier: "premium",
        },
        // Si el camino real funciona, esto NO se llega a llamar. Está aquí
        // porque el adaptador lo exige, y porque si acabara llamándose la
        // procedencia diría `MOCK` y la prueba lo cazaría.
        mockGenerator: () => ({ titular: "salida de reglas" }),
        requiereIaReal: true,
      } as never);

      // 1. La procedencia. `RULE_ENGINE` es publicable y honesto, pero NO es IA.
      expect(
        r.provenance?.outcome,
        `la llamada volvió como ${r.provenance?.outcome}: eso no es inferencia`,
      ).toBe("REAL_LLM_SUCCESS");
      expect(r.provenance?.provider).toBe("ollama");
      expect(r.provenance?.model, "no dice qué modelo respondió").toBeTruthy();

      // 2. Los tokens. Un modelo de 8B leyendo este prompt no gasta un token.
      //    Ese `1` es la firma de un doble de pruebas, y es exactamente lo que
      //    hay en los 14.178 eventos de produccion que dicen `ok: true`.
      expect(
        r.provenance?.tokensIn ?? 0,
        "tokens de entrada sospechosamente bajos: eso no ha leído el prompt",
      ).toBeGreaterThan(10);
      expect(r.provenance?.tokensOut ?? 0).toBeGreaterThan(3);

      // 3. El coste. Es local: si cuesta, no es local.
      // `costEstimateUsd`, NO `costUsd`. La primera version usaba el nombre
      // equivocado, y `undefined ?? 0` da 0: la comprobacion pasaba sin mirar
      // nada. Una asercion sobre un campo que no existe es peor que no tenerla,
      // porque ocupa el sitio de la que si comprobaria y ademas da confianza.
      expect(r.provenance?.costEstimateUsd, "una inferencia local no cuesta dinero").toBe(0);

      // 4. Y que haya dicho algo. Un modelo real que devuelve vacío es un fallo
      //    igual, sólo que más difícil de ver.
      expect(JSON.stringify(r.parsed ?? "").length).toBeGreaterThan(5);
    },
    180_000,
  );

  it("deja la evidencia de que se midió, con lo que salió", async () => {
    const { invokeLlm } = await import("../llmAdapter");
    const t0 = Date.now();
    const r = await invokeLlm({
      agentId: "agent-seo-audit",
      payload: { brief: { dominio: "ejemplo.es" }, on_page: {} },
      mockGenerator: () => ({ ok: false }),
      requiereIaReal: true,
    } as never);
    const ms = Date.now() - t0;

    const p = path.join(RAIZ, "docs", "evidence", "inferencia_local.json");
    const previo = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    fs.writeFileSync(
      p,
      `${JSON.stringify(
        {
          ...previo,
          llamadaReal: {
            procedencia: r.provenance?.outcome ?? null,
            proveedor: r.provenance?.provider ?? null,
            modelo: r.provenance?.model ?? null,
            tokensEntrada: r.provenance?.tokensIn ?? null,
            tokensSalida: r.provenance?.tokensOut ?? null,
            costeUsd: r.provenance?.costEstimateUsd ?? null,
            milisegundos: ms,
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    expect(r.provenance?.outcome).toBe("REAL_LLM_SUCCESS");
  }, 180_000);
});
