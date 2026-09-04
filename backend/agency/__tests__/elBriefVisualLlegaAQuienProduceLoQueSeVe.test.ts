/**
 * El brief visual llega a quien produce algo que se ve. Y sólo a ése.
 *
 * ── LO QUE PASABA ───────────────────────────────────────────────────────────
 *
 * `VisualEliteStrategyPipeline` lleva la cadena entera —dirección creativa,
 * guion, storyboard, prompts, dos variantes, revisión de cada una y las puertas
 * de presupuesto, licencia, privacidad y aprobación humana— y no lo llamaba
 * nadie. El motivo declarado: ningún encargo trae un brief visual.
 *
 * Y conectarlo tal cual habría sido PEOR que dejarlo suelto. Su dirección
 * creativa devolvía las mismas cuatro palabras para cualquier cliente
 * —«auténtico, profesional, cercano» más el sector interpolado—. Eso no es una
 * dirección: es un relleno con forma de decisión, y es exactamente lo genérico
 * que este sistema existe para evitar.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que dos marcas distintas reciban direcciones distintas, y que lo que no
 * consta NO se rellene. Un color de marca inventado se publica.
 *
 * COSTE EXTERNO: 0 EUR. El pipeline es determinista y su modo por defecto es
 * sólo estrategia: no llama a ningún proveedor visual.
 */
import { describe, expect, it } from "vitest";

import {
  SERVICIOS_CON_BRIEF_VISUAL,
  SIN_BRIEF_VISUAL_A_PROPOSITO,
  briefVisualComoTexto,
  componerBriefVisual,
  necesitaBriefVisual,
} from "../briefVisual";
import { runVisualEliteStrategyPipeline } from "../VisualEliteStrategyPipeline";
import mapaDeServicio from "../../calidad/mapaDeServicio.json";

const SERVICIOS = Object.keys((mapaDeServicio as { qaDe: Record<string, string> }).qaDe);

/** Un cerebro con la forma que devuelve el servicio real. */
function cerebroCon(dims: Array<[string, unknown]>) {
  return {
    workspaceId: 7,
    clientId: "c-1",
    dimensiones: new Map(
      dims.map(([id, valor]) => [
        id,
        { valor, procedencia: "cliente", confianza: 1, actualizado: new Date().toISOString() },
      ]),
    ),
    caducadas: [] as string[],
  } as never;
}

const CLINICA = cerebroCon([
  ["marca", { texto: "Clínica Aurora, azul profundo y blanco, tipografía serif" }],
  ["brand_voice", { texto: "tranquilizadora, sin urgencia, de usted" }],
  ["icp", { texto: "familias del barrio con hijos pequeños" }],
  ["propuesta_de_valor", { texto: "primera visita sin coste y sin venderte nada" }],
  ["lo_que_la_marca_no_hace", { items: ["antes y después de pacientes", "descuentos agresivos"] }],
  ["donde_se_usa_esto", { items: ["Instagram", "cartelería en consulta"] }],
]);

const INDUSTRIAL = cerebroCon([
  ["marca", { texto: "Salvatierra Operaciones, gris grafito, sin logotipo decorativo" }],
  ["brand_voice", { texto: "directa y sin adornos, habla de plantas y de números" }],
  ["icp", { texto: "directores de planta en industria manufacturera" }],
  ["propuesta_de_valor", { texto: "veinte años arreglando plantas que iban mal" }],
  ["lo_que_la_marca_no_hace", { items: ["fotos de gente sonriendo en reuniones"] }],
  ["donde_se_usa_esto", { items: ["LinkedIn", "propuestas en PDF"] }],
]);

const BASE = {
  workspaceId: 0,
  tenantId: "t-1",
  objective: "conseguir más consultas",
  budgetCentsMax: 0,
  commercialUse: false,
  privacyOk: false,
};

describe("el brief visual llega a quien produce lo que se ve", () => {
  // ── A QUIÉN LE TOCA ───────────────────────────────────────────────────────

  it("EL CONTROL: cada uno de los 29 servicios está decidido", () => {
    // Un servicio sin decidir es el que se cuela: ni lleva brief ni consta por
    // qué no lo lleva.
    const decididos = new Set([
      ...Object.keys(SERVICIOS_CON_BRIEF_VISUAL),
      ...Object.keys(SIN_BRIEF_VISUAL_A_PROPOSITO),
    ]);
    const sinDecidir = SERVICIOS.filter((s) => !decididos.has(s));
    expect(sinDecidir, `sin decidir: ${sinDecidir.join(", ")}`).toEqual([]);
  });

  it("lo lleva quien produce algo que se ve", () => {
    for (const s of ["web_premium", "branding_premium", "social_media_premium", "ads_premium"]) {
      expect(necesitaBriefVisual(s), `${s} debería llevar brief visual`).toBe(true);
    }
  });

  it("y NO lo lleva quien no produce nada que se mire", () => {
    // Obligar a todos a traer un brief visual llenaría de campos vacíos los que
    // no lo usan, y un formulario con campos que no importan enseña a
    // rellenarlo a boleo.
    for (const s of ["integraciones_apis_premium", "voz_premium", "seo_premium"]) {
      expect(necesitaBriefVisual(s), `${s} no debería llevar brief visual`).toBe(false);
    }
  });

  it("y cada exclusión explica por qué", () => {
    for (const [s, motivo] of Object.entries(SIN_BRIEF_VISUAL_A_PROPOSITO)) {
      expect(motivo.length, `${s} no explica por qué no lleva brief`).toBeGreaterThan(25);
    }
  });

  // ── EL BRIEF SALE DEL CEREBRO ─────────────────────────────────────────────

  it("LA REGLA: no se le pregunta al cliente lo que ya nos contó", () => {
    const b = componerBriefVisual(CLINICA);

    expect(b.marca).toMatch(/Aurora/);
    expect(b.vozDeMarca).toMatch(/tranquilizadora/);
    expect(b.publico).toMatch(/familias/);
    expect(b.loQueNoHace).toContain("antes y después de pacientes");
    expect(b.faltaLoImprescindible, "faltaba algo imprescindible teniéndolo todo").toBe(false);
  });

  it("lo que NO consta se NOMBRA, no se rellena", () => {
    // Un brief que calla lo que no sabe invita a rellenarlo, y un color de
    // marca inventado se publica.
    const b = componerBriefVisual(cerebroCon([["marca", { texto: "Solo la marca" }]]));

    expect(b.huecos).toContain("brand_voice");
    expect(b.huecos).toContain("icp");
    expect(b.faltaLoImprescindible).toBe(true);

    const texto = briefVisualComoTexto(b);
    expect(texto).toMatch(/NO lo inventes/);
    expect(texto).toMatch(/brand_voice/);
  });

  it("sin cerebro no devuelve un brief vacío: dice que no hay nada", () => {
    // Un brief vacío se lee como «no hay restricciones de marca», y ése es el
    // peor mensaje posible para una marca con reglas.
    const texto = briefVisualComoTexto(componerBriefVisual(null));
    expect(texto).toMatch(/No hay ningún dato visual registrado/);
    expect(texto).toMatch(/NO lo inventes/);
  });

  // ── DOS MARCAS, DOS DIRECCIONES ───────────────────────────────────────────

  it("LA PRUEBA QUE IMPORTA: dos marcas distintas reciben direcciones distintas", async () => {
    // Antes las dos recibían «auténtico, profesional, cercano».
    const clinica = await runVisualEliteStrategyPipeline({
      ...BASE,
      clientName: "Clínica Aurora",
      sector: "salud dental",
      visual: componerBriefVisual(CLINICA),
    });
    const industrial = await runVisualEliteStrategyPipeline({
      ...BASE,
      clientName: "Salvatierra Operaciones",
      sector: "consultoría industrial",
      visual: componerBriefVisual(INDUSTRIAL),
    });

    expect(
      clinica.creativeDirection.moodKeywords.join(","),
      "las dos marcas reciben el mismo mood",
    ).not.toBe(industrial.creativeDirection.moodKeywords.join(","));

    expect(clinica.creativeDirection.toneOfVoice).toMatch(/tranquilizadora/);
    expect(industrial.creativeDirection.toneOfVoice).toMatch(/sin adornos/);
    expect(clinica.creativeDirection.colorDirection).toMatch(/Aurora/);
  });

  it("las prohibiciones de la marca se SUMAN a las de la agencia", async () => {
    // Quitar las de la agencia porque el cliente tenga las suyas sería perder
    // las dos: una foto de stock genérica está mal para todo el mundo.
    const r = await runVisualEliteStrategyPipeline({
      ...BASE,
      clientName: "Clínica Aurora",
      sector: "salud dental",
      visual: componerBriefVisual(CLINICA),
    });

    expect(r.creativeDirection.visualDoNots).toContain("stock photos genéricas");
    expect(r.creativeDirection.visualDoNots).toContain("antes y después de pacientes");
  });

  it("sin brief, el tono queda DECLARADO como desconocido, no supuesto", async () => {
    const r = await runVisualEliteStrategyPipeline({
      ...BASE,
      clientName: "Sin datos SL",
      sector: "servicios",
      visual: componerBriefVisual(null),
    });

    expect(r.creativeDirection.toneOfVoice).toMatch(/No consta/);
    expect(r.creativeDirection.colorDirection).toMatch(/NO se inventa/);
  });

  // ── LAS PUERTAS SIGUEN AHÍ ────────────────────────────────────────────────

  it("EL CONTROL DE GASTO: sin aprobación humana no se renderiza, y cuesta 0", async () => {
    // La conexión no puede haber abierto una vía de gasto.
    const r = await runVisualEliteStrategyPipeline({
      ...BASE,
      clientName: "Clínica Aurora",
      sector: "salud dental",
      visual: componerBriefVisual(CLINICA),
    });

    expect(r.blockers).toContain("human_approval_required");
    expect(r.render.costCents, "la estrategia visual costó dinero").toBe(0);
    expect(r.render.mode).toBe("strategy_only");
  });
});
