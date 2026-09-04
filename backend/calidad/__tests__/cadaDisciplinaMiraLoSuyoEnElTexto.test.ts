/**
 * SEO, Ads, Social y Contenido miran lo suyo en el texto que sale.
 *
 * ── QUÉ AÑADEN ──────────────────────────────────────────────────────────────
 *
 * Ocho comprobaciones más, todas sobre la PROSA. No sobre fichas estructuradas:
 * ocho de las que ya había no podían dispararse nunca porque esperaban campos
 * que el agente no emite, y añadir más de ésas habría subido un contador sin
 * proteger de nada.
 *
 * Cada una mira el fallo que su disciplina comete de verdad:
 *
 *   SEO       un plan sin medición no se puede defender a los tres meses;
 *             un negocio con dirección al que no se le toca el SEO local.
 *   ADS       gastar sin medir la conversión; mandar tráfico pagado a la home.
 *   SOCIAL    estar en una red porque existe; el mismo post en cinco sitios.
 *   CONTENIDO contenido sin distribución; escribirle igual a quien acaba de
 *             descubrirte y a quien ya compara precios.
 *
 * ── LO QUE MÁS SE PRUEBA ────────────────────────────────────────────────────
 *
 * Que NO salten cuando no deben. Cada regla tiene su control, y varias tienen
 * además el caso donde NO APLICAN — un SaaS que vende en toda Europa no
 * necesita ficha de Google, y con una sola red no hay adaptación que juzgar.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";

import { MotorDeCalidad, type Pieza } from "../MotorDeCalidad";

const motor = new MotorDeCalidad();
const juzgar = (dominio: string, p: Partial<Pieza>) =>
  motor.evaluar({ dominio, autor: "productor", contenido: {}, ...p }, "qa");
const hallazgo = (r: ReturnType<typeof juzgar>, id: string) =>
  r.hallazgos.find((h) => h.id === id);

/** Relleno de longitud suficiente para que los detectores opinen. */
const RELLENO = `El trabajo se organiza en fases y cada una se cierra con un entregable
  concreto que el cliente puede revisar. Las decisiones se toman con lo que se sabe del
  negocio y se dejan por escrito para poder discutirlas más adelante sin depender de la
  memoria de nadie. Lo que no se sepa se dice.`;

describe("cada disciplina mira lo suyo en el texto", () => {
  // ── SEO ─────────────────────────────────────────────────────────────────

  it("SEO: un plan sin medición se avisa", () => {
    const r = juzgar("seo", { contenido: { texto: RELLENO } });
    expect(hallazgo(r, "dice-como-se-va-a-medir")).toBeDefined();
  });

  it("SEO: y con medición, no", () => {
    const con = `${RELLENO} El avance se sigue en Search Console mirando impresiones y
      clics por consulta, y las conversiones en Analytics.`;
    expect(hallazgo(juzgar("seo", { contenido: { texto: con } }), "dice-como-se-va-a-medir"))
      .toBeUndefined();
  });

  it("SEO: un negocio con dirección sin SEO local se avisa", () => {
    const r = juzgar("seo", {
      contenido: { texto: RELLENO },
      contexto: { ubicacion: "Sevilla" },
    });
    expect(hallazgo(r, "el-seo-local-cuando-el-negocio-es-local")).toBeDefined();
  });

  it("SEO: pero NO APLICA si el negocio no atiende en un sitio", () => {
    // Un SaaS que vende en toda Europa no necesita ficha de Google. Exigírsela
    // sería ruido, y una comprobación que salta siempre se ignora.
    const r = juzgar("seo", { contenido: { texto: RELLENO } });
    expect(hallazgo(r, "el-seo-local-cuando-el-negocio-es-local")).toBeUndefined();
  });

  it("SEO: y con SEO local trabajado, tampoco", () => {
    const con = `${RELLENO} Se trabaja el perfil de empresa en Google con fotos reales y
      un plan de reseñas de pacientes.`;
    const r = juzgar("seo", { contenido: { texto: con }, contexto: { ubicacion: "Sevilla" } });
    expect(hallazgo(r, "el-seo-local-cuando-el-negocio-es-local")).toBeUndefined();
  });

  // ── ADS ─────────────────────────────────────────────────────────────────

  it("ADS: gastar sin decir cómo se mide la conversión se avisa", () => {
    const r = juzgar("ads", { contenido: { texto: RELLENO } });
    expect(hallazgo(r, "dice-como-se-medira-la-conversion")).toBeDefined();
  });

  it("ADS: mandar el clic a ninguna parte se avisa", () => {
    // Tráfico pagado a la home es la forma más común de quemar presupuesto.
    const r = juzgar("ads", { contenido: { texto: RELLENO } });
    expect(hallazgo(r, "el-anuncio-tiene-donde-aterrizar")).toBeDefined();
  });

  it("ADS: y un plan con medición y destino no se avisa por ninguna", () => {
    const con = `${RELLENO} Cada campaña apunta a su propia landing con la misma promesa
      del anuncio, y la conversión se mide con un evento propio en GA4.`;
    const r = juzgar("ads", { contenido: { texto: con } });
    expect(hallazgo(r, "dice-como-se-medira-la-conversion")).toBeUndefined();
    expect(hallazgo(r, "el-anuncio-tiene-donde-aterrizar")).toBeUndefined();
  });

  // ── SOCIAL ──────────────────────────────────────────────────────────────

  it("SOCIAL: nombrar redes sin decir por qué ésas se avisa", () => {
    // Estar en una red porque existe es como se acaba publicando lo mismo en
    // cinco sitios sin resultado en ninguno.
    const r = juzgar("social", {
      contenido: { texto: `${RELLENO} Se publicará en Instagram, TikTok y LinkedIn.` },
    });
    expect(hallazgo(r, "cada-red-tiene-su-motivo")).toBeDefined();
  });

  it("SOCIAL: y con el motivo, no", () => {
    const con = `${RELLENO} Se trabaja LinkedIn porque es donde está su público —directores
      de planta— y se descarta TikTok, que no tiene sentido para esta audiencia.`;
    expect(hallazgo(juzgar("social", { contenido: { texto: con } }), "cada-red-tiene-su-motivo"))
      .toBeUndefined();
  });

  it("SOCIAL: varias redes sin un solo formato propio se avisa", () => {
    const r = juzgar("social", {
      contenido: { texto: `${RELLENO} Publicaremos en Instagram, TikTok y LinkedIn cada semana.` },
    });
    const h = hallazgo(r, "el-formato-cambia-con-la-red");
    expect(h, "tres redes con el mismo post pasaron sin decir nada").toBeDefined();
    expect(h!.quePasa).toMatch(/mismo post/);
  });

  it("SOCIAL: con formatos propios de cada una, no", () => {
    const con = `${RELLENO} En TikTok, vídeo vertical de 20 segundos; en LinkedIn, un
      documento en carrusel; en Instagram, reels con el mismo material remontado.`;
    expect(hallazgo(juzgar("social", { contenido: { texto: con } }), "el-formato-cambia-con-la-red"))
      .toBeUndefined();
  });

  it("SOCIAL: y con UNA sola red NO APLICA: no hay adaptación que juzgar", () => {
    const una = `${RELLENO} Todo el esfuerzo va a LinkedIn, porque es donde está su público.`;
    expect(hallazgo(juzgar("social", { contenido: { texto: una } }), "el-formato-cambia-con-la-red"))
      .toBeUndefined();
  });

  // ── CONTENIDO ───────────────────────────────────────────────────────────

  it("CONTENIDO: sin distribución se avisa", () => {
    // Publicar no es distribuir. Contenido sin distribución no lo lee nadie.
    const r = juzgar("contenido", { contenido: { texto: RELLENO } });
    expect(hallazgo(r, "dice-donde-se-va-a-distribuir")).toBeDefined();
  });

  it("CONTENIDO: hablarle igual a quien descubre y a quien decide se avisa", () => {
    const r = juzgar("contenido", { contenido: { texto: RELLENO } });
    expect(hallazgo(r, "cada-pieza-sabe-a-quien-pilla-donde")).toBeDefined();
  });

  it("CONTENIDO: y un plan con distribución y momento no se avisa por ninguna", () => {
    const con = `${RELLENO} Las piezas de descubrimiento salen en búsqueda orgánica y las
      de decisión se mandan por la newsletter a quien ya pidió presupuesto.`;
    const r = juzgar("contenido", { contenido: { texto: con } });
    expect(hallazgo(r, "dice-donde-se-va-a-distribuir")).toBeUndefined();
    expect(hallazgo(r, "cada-pieza-sabe-a-quien-pilla-donde")).toBeUndefined();
  });

  // ── EL LÍMITE ───────────────────────────────────────────────────────────

  it("ninguna de LAS NUEVAS bloquea: son heurísticos de palabras", () => {
    // Se acota a las nuevas a propósito. Las que ya había SÍ bloquean con razón
    // —un plan de Ads sin presupuesto declarado no se puede ejecutar— y meterlas
    // en esta comprobación sería pedirle a la batería que juzgue algo que no es
    // suyo.
    const NUEVAS = new Set([
      "dice-como-se-va-a-medir",
      "el-seo-local-cuando-el-negocio-es-local",
      "dice-como-se-medira-la-conversion",
      "el-anuncio-tiene-donde-aterrizar",
      "cada-red-tiene-su-motivo",
      "el-formato-cambia-con-la-red",
      "dice-donde-se-va-a-distribuir",
      "cada-pieza-sabe-a-quien-pilla-donde",
    ]);

    let vistas = 0;
    for (const d of ["seo", "ads", "social", "contenido"]) {
      const r = juzgar(d, { contenido: { texto: RELLENO } });
      for (const h of r.hallazgos.filter((x) => NUEVAS.has(x.id))) {
        vistas += 1;
        expect(h.gravedad, `${d}.${h.id} bloquea siendo un heurístico de palabras`)
          .toBe("aviso");
      }
    }
    // Y que se hayan visto de verdad: cero hallazgos sería un verde vacío.
    expect(vistas, "no se disparó ninguna de las nuevas").toBeGreaterThan(3);
  });

  it("y ninguna opina sobre un texto de dos palabras", () => {
    // La ausencia de una palabra en un titular no significa nada.
    for (const d of ["seo", "ads", "contenido"]) {
      const r = juzgar(d, { contenido: { titular: "Plan" } });
      for (const id of ["dice-como-se-va-a-medir", "dice-donde-se-va-a-distribuir"]) {
        expect(hallazgo(r, id), `${d}.${id} opinó sobre dos palabras`).toBeUndefined();
      }
    }
  });
});
