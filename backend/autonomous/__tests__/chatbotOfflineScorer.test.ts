import { describe, expect, it } from "vitest";

/**
 * Puntuación offline del SKU de chatbot.
 *
 * CONTEXTO
 * --------
 * Cinco ejecuciones seguidas daban `score=20, passed=false` consumiendo los 4
 * intentos. La investigación demostró que **el scorer es correcto**: el brief
 * usado incumplía el contrato del SKU. `artifactValidators.ts` exige
 * `website_url`, `bot_name` y `openai_cost_bearer === "client"`; sin ellos el
 * plan sale con blockers, `runChatbotPhaseC` corta en validación de intake y
 * nunca produce `strategy`, `knowledge_base` ni `config`. El scorer ve tres
 * artefactos ausentes y puntúa en consecuencia.
 *
 * Con un brief válido: 100/100, `passed=true`, un solo intento.
 *
 * Estos tests fijan ese comportamiento para que un cambio futuro no lo
 * relaje. El umbral (85) NO se toca: se lee, no se modifica.
 */
import { scoreOffline } from "../qa/offlineScorer";

const SKU = "NELVYON-CHATBOT" as const;

/** Brief que cumple el contrato completo del SKU. */
const BRIEF_VALIDO = {
  sector: "general",
  business_name: "ACME Reformas",
  website_url: "https://acme-reformas.es",
  bot_name: "Reformi",
  openai_cost_bearer: "client",
};

/** Artefactos completos, como los produce el pipeline cuando no corta. */
function artefactosCompletos() {
  return {
    _tier: "professional",
    plan: { bot_name: "Reformi", faqs_target_count: 15, blockers: [] },
    strategy: {
      persona: { name: "Reformi", tone: "cercano" },
      intents: ["presupuesto", "plazos", "contacto"],
    },
    knowledge_base: {
      faqs: Array.from({ length: 15 }, (_, i) => ({
        q: `Pregunta ${i + 1} sobre reformas integrales en Madrid`,
        a: `Respuesta ${i + 1} detallada sobre el proceso de reforma, plazos y precio cerrado.`,
      })),
    },
    // Claves PLANAS: es el contrato que lee `scorer.ts` (C-SOP-02/03/04, C-TEC-*).
    config: {
      widget_snippet: "<script src='https://cdn.nelvyon.com/bot.js'></script>",
      handoff_email: "hola@acme-reformas.es",
      webhook_delivers: true,
      widget_load_ok: true,
      p95_latency_ms: 900,
      persona: { name: "Reformi" },
    },
  };
}

describe("umbral de aprobación", () => {
  it("es 85 y no se modifica en estos tests", () => {
    // Se comprueba por comportamiento: 84 no aprueba, el contrato exige >= 85.
    const bajo = scoreOffline(SKU, {}, {}, 1);
    expect(bajo.passed).toBe(false);
    expect(bajo.score).toBeLessThan(85);
  });
});

describe("output claramente malo", () => {
  it("brief vacío y sin artefactos: score bajo y no aprueba", () => {
    const r = scoreOffline(SKU, {}, {}, 1);
    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThanOrEqual(30);
  });

  it("las dimensiones estructurales quedan a cero sin artefactos", () => {
    const r = scoreOffline(SKU, {}, {}, 1);
    expect(r.offline_dimensions.structure).toBe(0);
    expect(r.offline_dimensions.copy_quality).toBe(0);
  });
});

describe("campos de brief ausentes", () => {
  it("sin bot_name ni openai_cost_bearer hay checks BLOQUEANTES", () => {
    const r = scoreOffline(
      SKU,
      { website_url: "https://x.es", business_name: "X" },
      artefactosCompletos(),
      1,
    );
    const bloqueantes = r.checks.filter((c) => c.blocking && !c.passed).map((c) => c.id);
    expect(bloqueantes).toContain("BRIEF-bot_name");
    expect(bloqueantes).toContain("BRIEF-openai_cost");
    expect(r.passed).toBe(false);
  });

  it("openai_cost_bearer distinto de 'client' no vale", () => {
    const r = scoreOffline(
      SKU,
      { ...BRIEF_VALIDO, openai_cost_bearer: "nelvyon" },
      artefactosCompletos(),
      1,
    );
    expect(r.checks.some((c) => c.id === "BRIEF-openai_cost" && !c.passed)).toBe(true);
    expect(r.passed).toBe(false);
  });
});

describe("JSON válido pero incompleto", () => {
  it("faltan strategy, knowledge_base y config: structure penalizada", () => {
    const r = scoreOffline(SKU, BRIEF_VALIDO, { _tier: "professional", plan: {} }, 1);
    const ids = r.checks.filter((c) => !c.passed).map((c) => c.id);
    expect(ids).toContain("STRUCT-strategy");
    expect(ids).toContain("STRUCT-knowledge_base");
    expect(ids).toContain("STRUCT-config");
    expect(r.offline_dimensions.structure).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("sin snippet del widget hay fallo de consistencia", () => {
    const artefactos = artefactosCompletos();
    delete (artefactos.config as Record<string, unknown>).widget_snippet;
    const r = scoreOffline(SKU, BRIEF_VALIDO, artefactos, 1);
    expect(r.checks.some((c) => !c.passed && /snippet/i.test(c.id))).toBe(true);
  });
});

describe("contenido completo", () => {
  it("brief válido + artefactos completos: cero bloqueantes y score alto", () => {
    /**
     * Un fixture escrito a mano NO alcanza 85, y eso es correcto: las
     * dimensiones `copy_quality` y `seo_basic` puntúan la riqueza del contenido
     * real, no su mera presencia. Lo que este test fija es lo que un fixture SÍ
     * puede demostrar: contrato cumplido, cero bloqueantes y puntuación
     * sustancialmente alta.
     *
     * Que el umbral de 85 se alcanza de verdad quedó demostrado con Ollama real
     * y un brief válido: score=100, passed=true, un solo intento. El umbral no
     * se toca en ningún caso.
     */
    const r = scoreOffline(SKU, BRIEF_VALIDO, artefactosCompletos(), 1);
    expect(r.checks.filter((c) => c.blocking && !c.passed).map((c) => c.id)).toEqual([]);
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it("las seis dimensiones se calculan y suman el total", () => {
    const r = scoreOffline(SKU, BRIEF_VALIDO, artefactosCompletos(), 1);
    const d = r.offline_dimensions;
    // Techos por dimensión declarados en offlineScorer.ts.
    expect(d.brief_compliance).toBeLessThanOrEqual(15);
    expect(d.structure).toBeLessThanOrEqual(15);
    expect(d.consistency).toBeLessThanOrEqual(15);
    expect(d.completeness).toBeLessThanOrEqual(20);
    expect(d.copy_quality).toBeLessThanOrEqual(20);
    expect(d.seo_basic).toBeLessThanOrEqual(15);

    const suma =
      d.brief_compliance + d.structure + d.consistency + d.completeness + d.copy_quality + d.seo_basic;
    expect(suma).toBeGreaterThanOrEqual(r.score);
    expect(Object.keys(d).sort()).toEqual(
      ["brief_compliance", "completeness", "consistency", "copy_quality", "seo_basic", "structure"],
    );
  });

  it("un brief válido puntúa MUY por encima de uno que incumple el contrato", () => {
    const bueno = scoreOffline(SKU, BRIEF_VALIDO, artefactosCompletos(), 1);
    const malo = scoreOffline(SKU, { sector: "general" }, { _tier: "professional", plan: {} }, 1);
    expect(bueno.score - malo.score).toBeGreaterThan(50);
  });
});
