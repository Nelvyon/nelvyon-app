/**
 * Las comprobaciones que funcionan sobre lo que el agente devuelve de verdad.
 *
 * ── POR QUÉ HACÍAN FALTA ────────────────────────────────────────────────────
 *
 * WEB tenía cuatro comprobaciones y dos de ellas no podían dispararse nunca:
 * esperaban una ficha estructurada —`camposDelFormulario`, `ctasPrincipales`—
 * y el agente devuelve prosa. Efectivamente vivas: dos. ECOMMERCE y CRM, dos
 * cada uno.
 *
 * Añadir más comprobaciones que esperasen fichas habría subido un contador sin
 * proteger de nada.
 *
 * ── POR QUÉ TODAS SON AVISOS ────────────────────────────────────────────────
 *
 * Un detector de palabras puede estar seguro de lo que NO aparece: si en todo un
 * plan de web no sale ni una vez el sector del cliente ni su diferencial, no se
 * ha escrito para él. Pero no puede estar seguro de lo contrario — un sinónimo o
 * una perífrasis lo despistan.
 *
 * Bloquear con esa certeza sería acusar de más. Avisar es lo honesto.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que NO salten cuando no deben. Una comprobación que avisa siempre convierte la
 * lista de avisos en ruido, y entonces también se ignoran los que importaban.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";

import { MotorDeCalidad, type Pieza } from "../MotorDeCalidad";

const motor = new MotorDeCalidad();
const juzgar = (p: Partial<Pieza>) =>
  motor.evaluar({ dominio: "web", autor: "productor", contenido: {}, ...p }, "qa");
const hallazgo = (r: ReturnType<typeof juzgar>, id: string) =>
  r.hallazgos.find((h) => h.id === id);

/** Un plan de web escrito para una clínica dental concreta. */
const PLAN_PARA_LA_CLINICA = `La estructura arranca por lo que más buscan los pacientes de
  salud dental cuando tienen dolor: poder pedir cita hoy. La página principal lleva un
  único botón de reserva visible sin bajar, y debajo el detalle de los tratamientos.
  El formulario de contacto pide sólo nombre y teléfono, y al enviarlo se muestra una
  confirmación con el plazo de respuesta: te responde una persona en menos de dos horas
  en horario de consulta. Las urgencias tienen su propia página porque son la mitad de
  las llamadas.`;

/** El mismo plan, sin nada que lo ate a este cliente. */
const PLAN_GENERICO = `La estructura del sitio se organiza en secciones claras con una
  jerarquía visual bien definida. Cada página cumple una función dentro del recorrido y
  la navegación se mantiene consistente. Los contenidos se distribuyen de forma
  equilibrada y la maquetación se adapta a los distintos tamaños de pantalla,
  garantizando una experiencia coherente en todos los dispositivos y manteniendo la
  identidad visual en cada punto del sitio.`;

const CONTEXTO = { sector: "salud dental", diferenciacion: "urgencias el mismo día" };

describe("lo que se puede afirmar mirando el texto", () => {
  // ── WEB ───────────────────────────────────────────────────────────────────

  it("LA REGLA: un plan que no menciona el negocio del cliente se avisa", () => {
    const r = juzgar({ contenido: { texto: PLAN_GENERICO }, contexto: CONTEXTO });
    const h = hallazgo(r, "la-web-habla-del-negocio-del-cliente");
    expect(h, "un plan sin una sola palabra del cliente pasó sin decir nada").toBeDefined();
    expect(h!.gravedad, "un heurístico de palabras no puede BLOQUEAR").toBe("aviso");
  });

  it("EL CONTROL: uno escrito para él NO se avisa", () => {
    // Sin esto, una comprobación que avisara siempre convertiría la lista de
    // avisos en ruido, y entonces también se ignorarían los que importaban.
    const r = juzgar({ contenido: { texto: PLAN_PARA_LA_CLINICA }, contexto: CONTEXTO });
    expect(hallazgo(r, "la-web-habla-del-negocio-del-cliente")).toBeUndefined();
  });

  it("y NO APLICA si no consta a qué se dedica el cliente", () => {
    // Sin sector declarado no se puede juzgar si la pieza habla de él. Eso es
    // «no aplica», no «pasa» ni «falla».
    const r = juzgar({ contenido: { texto: PLAN_GENERICO } });
    expect(hallazgo(r, "la-web-habla-del-negocio-del-cliente")).toBeUndefined();
  });

  it("una web que no le pide nada al visitante se avisa", () => {
    // Se lee, se asiente y se cierra.
    const r = juzgar({ contenido: { texto: PLAN_GENERICO }, contexto: CONTEXTO });
    expect(hallazgo(r, "el-visitante-sabe-que-hacer")).toBeDefined();
  });

  it("y la que sí, no", () => {
    const r = juzgar({ contenido: { texto: PLAN_PARA_LA_CLINICA }, contexto: CONTEXTO });
    expect(hallazgo(r, "el-visitante-sabe-que-hacer")).toBeUndefined();
  });

  it("si hay formulario y no se dice qué pasa después, se avisa", () => {
    // El silencio tras enviar un formulario es donde se pierde la confianza: no
    // se sabe si ha llegado ni cuándo contestarán.
    const sinRespuesta = `${PLAN_GENERICO} Se incluye un formulario de contacto en la
      página de servicios y otro en la home para solicitar presupuesto.`;
    const r = juzgar({ contenido: { texto: sinRespuesta }, contexto: CONTEXTO });
    expect(hallazgo(r, "dice-que-pasa-tras-el-formulario")).toBeDefined();
  });

  it("y si lo dice, no", () => {
    const r = juzgar({ contenido: { texto: PLAN_PARA_LA_CLINICA }, contexto: CONTEXTO });
    expect(hallazgo(r, "dice-que-pasa-tras-el-formulario")).toBeUndefined();
  });

  it("sin formulario, la comprobación NO aplica", () => {
    const r = juzgar({ contenido: { texto: PLAN_GENERICO }, contexto: CONTEXTO });
    expect(hallazgo(r, "dice-que-pasa-tras-el-formulario")).toBeUndefined();
  });

  // ── ECOMMERCE ─────────────────────────────────────────────────────────────

  it("una tienda que no habla de envío ni devoluciones se avisa", () => {
    // Son las dos preguntas que decide un comprador antes de pagar.
    const r = motor.evaluar(
      { dominio: "ecommerce", autor: "productor", contenido: { texto: PLAN_GENERICO } },
      "qa",
    );
    const h = hallazgo(r, "el-envio-y-la-devolucion-se-dicen");
    expect(h).toBeDefined();
    expect(h!.quePasa).toMatch(/env[íi]o/);
  });

  it("y una que habla de las dos, no", () => {
    const conAmbas = `${PLAN_GENERICO} El envío se calcula en el carrito antes de pedir
      datos de pago, y la política de devoluciones aparece en la ficha de producto con
      el plazo de reembolso.`;
    const r = motor.evaluar(
      { dominio: "ecommerce", autor: "productor", contenido: { texto: conAmbas } },
      "qa",
    );
    expect(hallazgo(r, "el-envio-y-la-devolucion-se-dicen")).toBeUndefined();
  });

  // ── CRM ───────────────────────────────────────────────────────────────────

  it("un seguimiento sin dueño ni momento se avisa", () => {
    // Sin quién y sin cuándo, un seguimiento no ocurre: es un diagrama.
    const r = motor.evaluar(
      { dominio: "crm", autor: "productor", contenido: { texto: PLAN_GENERICO } },
      "qa",
    );
    expect(hallazgo(r, "el-seguimiento-tiene-dueno-y-momento")).toBeDefined();
  });

  it("y uno con los dos, no", () => {
    const conAmbos = `${PLAN_GENERICO} Cada contacto nuevo se asigna a un comercial
      responsable en el momento de entrar, y el primer intento de llamada se hace en
      menos de 2 horas dentro del horario laboral.`;
    const r = motor.evaluar(
      { dominio: "crm", autor: "productor", contenido: { texto: conAmbos } },
      "qa",
    );
    expect(hallazgo(r, "el-seguimiento-tiene-dueno-y-momento")).toBeUndefined();
  });

  // ── EL LÍMITE, DECLARADO ──────────────────────────────────────────────────

  it("ninguna opina sobre un texto corto", () => {
    // La ausencia de una palabra en dos frases no significa nada.
    const r = juzgar({ contenido: { titular: "Bienvenido" }, contexto: CONTEXTO });
    for (const id of [
      "la-web-habla-del-negocio-del-cliente",
      "el-visitante-sabe-que-hacer",
    ]) {
      expect(hallazgo(r, id), `${id} opinó sobre dos palabras`).toBeUndefined();
    }
  });

  it("y ninguna bloquea: son heurísticos, y se les nota", () => {
    const r = juzgar({ contenido: { texto: PLAN_GENERICO }, contexto: CONTEXTO });
    const nuevas = r.hallazgos.filter((h) =>
      ["la-web-habla-del-negocio-del-cliente", "el-visitante-sabe-que-hacer"].includes(h.id),
    );
    expect(nuevas.length).toBeGreaterThan(0);
    for (const h of nuevas) expect(h.gravedad).toBe("aviso");
  });
});
