/**
 * A cada servicio se le pregunta lo suyo, no lo de todos.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `getExtraFields` tenía preguntas propias para CUATRO de los veintinueve
 * servicios —web, seo, ads y social—. Los otros veinticinco recibían sólo los
 * campos comunes: nombre, sector, público, tono, colores, referencias.
 *
 * Un cliente que contrataba `email_marketing_premium` no decía nada de su lista,
 * de su consentimiento ni de su cadencia. Uno de `ecommerce_premium`, nada de su
 * catálogo, su margen ni sus gastos de envío. El agente trabajaba sin ese dato
 * porque nadie se lo había pedido, y el cliente creía haber contado su negocio.
 *
 * Y el dato estaba declarado desde hacía tiempo: `dimensionesQueAportaElCliente`
 * dice, por servicio, qué le toca decir al cliente y con qué pregunta exacta.
 * Dos fuentes de la misma verdad, y sólo una se mantenía.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que el formulario DISCRIMINE. Si todos los servicios acabaran con la misma
 * lista, se habría cambiado un formulario genérico por otro más largo —y más
 * largo es peor, porque cuesta más abandonarlo a la mitad.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";

import { getSchemaForService, validateIntake } from "../IntakeFormService";
import mapaDeServicio from "../../calidad/mapaDeServicio.json";

const SERVICIOS = Object.keys((mapaDeServicio as { qaDe: Record<string, string> }).qaDe);

const nombres = (s: string) => getSchemaForService(s).map((f) => f.name);

describe("a cada servicio se le pregunta lo suyo", () => {
  it("EL CONTROL: hay veintinueve servicios que mirar", () => {
    expect(SERVICIOS.length).toBeGreaterThanOrEqual(29);
  });

  it("LA REGLA: ningún servicio se queda sólo con las preguntas comunes", () => {
    // Doce campos comunes es exactamente lo que tenían veinticinco de ellos.
    const flojos = SERVICIOS.filter((s) => nombres(s).length <= 12);
    expect(flojos, `estos servicios no preguntan nada propio: ${flojos.join(", ")}`).toEqual([]);
  });

  it("y no todos preguntan lo mismo", () => {
    // Si la lista fuera idéntica para todos, se habría cambiado un formulario
    // genérico por otro más largo. Más largo es peor: se abandona antes.
    const huellas = new Set(SERVICIOS.map((s) => nombres(s).sort().join("|")));
    expect(huellas.size, "los veintinueve piden exactamente lo mismo").toBeGreaterThan(5);
  });

  it("un servicio de correo pregunta por su lista y su consentimiento", () => {
    const n = nombres("email_marketing_premium");
    expect(n).toContain("lista_de_correo");
    // `salud_de_envio` NO aparece, y es correcto: el cerebro la marca como
    // aportada por la MEDICIÓN. No se le pide al cliente lo que debemos deducir
    // nosotros — preguntárselo sería trasladarle nuestro trabajo.
    expect(n).not.toContain("salud_de_envio");
  });

  it("uno de ecommerce pregunta por su catálogo y su economía del pedido", () => {
    const n = nombres("ecommerce_premium");
    expect(n).toContain("catalogo");
    expect(n).toContain("economia_del_pedido");
  });

  it("y NO le pregunta a web por los gastos de envío", () => {
    // Es la otra mitad de la regla: preguntar de más también es un defecto.
    // Un formulario que pide lo que no se va a usar enseña a rellenarlo a boleo.
    expect(nombres("web_premium")).not.toContain("economia_del_pedido");
  });

  // ── LO QUE NO SE ROMPE ────────────────────────────────────────────────────

  it("los cuatro que ya tenían formulario propio lo conservan entero", () => {
    // Las preguntas escritas a mano estaban afinadas. Sustituirlas por las
    // derivadas habría sido cambiar algo bueno por algo automático.
    expect(nombres("web_premium")).toContain("pages");
    expect(nombres("seo_premium")).toContain("targetKeywords");
    expect(nombres("ads_premium")).toContain("monthlyBudget");
  });

  it("y las comunes siguen delante", () => {
    const n = nombres("branding_premium");
    expect(n.slice(0, 3)).toEqual(["clientName", "industry", "targetAudience"]);
  });

  // ── PEDIR NO ES EXIGIR ────────────────────────────────────────────────────

  it("las preguntas nuevas NO bloquean la contratación", () => {
    // Bloquear porque el cliente no ha contestado doce preguntas convierte el
    // alta en un examen, y quien no lo aprueba se va. Lo que falte lo NOMBRA
    // `contextoDeNegocio` en la instrucción del agente.
    const minimo = {
      clientName: "Acme",
      industry: "salud dental",
      targetAudience: "familias del barrio",
      tone: "profesional",
      competitors: ["Clinica Vecina"],
      primaryColor: "#0f172a",
      secondaryColor: "#64748b",
      referenceUrls: ["https://ejemplo.com"],
    };
    const r = validateIntake("email_marketing_premium", minimo);
    expect(r.valid, `el alta se bloqueó: ${JSON.stringify(r.errors)}`).toBe(true);
  });

  it("ninguna pregunta derivada se marca obligatoria", () => {
    for (const s of SERVICIOS) {
      const comunes = new Set(["clientName", "industry", "targetAudience", "tone", "competitors"]);
      const derivadas = getSchemaForService(s).filter(
        (f) => f.name.includes("_") && !comunes.has(f.name),
      );
      for (const f of derivadas) {
        expect(f.required, `${s}.${f.name} es obligatoria`).toBe(false);
      }
    }
  });

  it("no se pregunta dos veces lo mismo", () => {
    // Ver «¿En qué sector operas?» dos veces en el mismo formulario es la forma
    // más rápida de que alguien deje de leerlo.
    for (const s of SERVICIOS) {
      const n = nombres(s);
      expect(new Set(n).size, `${s} repite campos`).toBe(n.length);
    }
  });
});
