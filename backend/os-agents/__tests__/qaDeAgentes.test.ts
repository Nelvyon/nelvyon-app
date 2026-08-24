/**
 * BLOQUE 3 · el QA de agentes detecta lo que tiene que detectar, y NO lo demás.
 *
 * Un QA tiene dos formas de ser inútil, y las dos acaban igual:
 *
 *   - **Aprueba siempre.** Entonces no protege y nadie lo nota.
 *   - **Rechaza lo correcto.** Entonces lo desactivan, o aprenden a ignorarlo.
 *
 * La segunda es la que había aquí: la lista de marcadores de posición incluía
 * la cadena `"todo"` y se comprobaba con `includes`. En un producto en español
 * eso marca como relleno casi cualquier texto legítimo. Un QA así sigue
 * apareciendo en el informe como si protegiera.
 */
import { describe, expect, it } from "vitest";

import { AgentQualityService } from "../AgentQualityService";

const svc = new AgentQualityService({} as never);

/** Un entregable real, en español, largo y sin marcadores. */
const BUENO =
  "Auditoria seo para el sector clinicas. Se revisa todo el embudo de captacion, " +
  "sobre todo la parte movil, que es donde se pierde mas gente. Se proponen tres " +
  "grupos de contenido y un plan de enlazado interno con plazos medibles.";

describe("BLOQUE 3 · QA de agentes", () => {
  it("EL CONTROL: un entregable correcto PASA", async () => {
    // Sin esto, un validador que rechazara todo pasaria las pruebas negativas y
    // dejaria el sistema sin poder entregar nada.
    const r = await svc.validateOutput(BUENO, "seo", "clinicas");
    expect(r.valid, `rechazo lo correcto: ${r.issues.join(" | ")}`).toBe(true);
    expect(r.score).toBe(100);
  });

  it("la palabra `todo` en español NO se confunde con un marcador", async () => {
    // El defecto que fija esta prueba. "todo" es de las palabras mas comunes del
    // castellano; buscarla como subcadena marcaba como relleno casi cualquier
    // entregable real.
    const texto = BUENO;
    expect(texto.toLowerCase()).toContain("todo"); // el texto SI la contiene
    const r = await svc.validateOutput(texto, "seo", "clinicas");
    expect(r.issues.join(" ")).not.toMatch(/todo/i);
  });

  // Un bucle explicito en vez de `it.each` con tuplas: con tuplas, el argumento
  // que llega al callback depende de como vitest infiera el tipo, y aqui llegaba
  // el par entero en vez de la primera posicion. La prueba fallaba por su propia
  // forma, no por el codigo que mide.
  const CON_MARCADOR: Array<[string, string]> = [
    ["lorem ipsum dolor sit amet, y mas texto de relleno para el sector", "lorem"],
    ["Resumen seo del sector clinicas. TODO: completar la seccion de enlaces", "TODO:"],
    ["Analisis seo para clinicas [insertar aqui el resumen ejecutivo] y cierre", "corchetes"],
    ["Informe seo de clinicas. Esta seccion es un placeholder de momento", "placeholder"],
    ["Informe seo del sector clinicas. Resultado: FIXME revisar cifras", "FIXME"],
  ];

  for (const [texto, nombre] of CON_MARCADOR) {
    it(`detecta el marcador ${nombre}`, async () => {
      const r = await svc.validateOutput(texto, "seo", "clinicas");
      expect(r.valid, `no detecto ${nombre}`).toBe(false);
      expect(r.issues.length).toBeGreaterThan(0);
    });
  }

  it("detecta contenido vacio o demasiado corto", async () => {
    const r = await svc.validateOutput("seo clinicas", "seo", "clinicas");
    expect(r.valid).toBe(false);
    expect(r.issues.join(" ")).toMatch(/too short/i);
  });

  it("detecta que el entregable no habla del servicio pedido", async () => {
    // Un texto correcto pero sobre otra cosa es un fallo de encargo, y es el que
    // mas facil se cuela: se lee bien.
    const texto =
      "Plan de redes sociales para clinicas con calendario mensual y tres " +
      "formatos por semana, adaptado al publico local y con metricas de alcance.";
    const r = await svc.validateOutput(texto, "seo", "clinicas");
    expect(r.issues.join(" ")).toMatch(/service type/i);
  });

  it("detecta que el entregable no habla del sector del cliente", async () => {
    const texto =
      "Auditoria seo generica con revision tecnica, palabras clave y contenido, " +
      "sin ninguna referencia al negocio concreto ni a su publico.";
    const r = await svc.validateOutput(texto, "seo", "clinicas");
    expect(r.issues.join(" ")).toMatch(/sector/i);
  });

  it("la puntuacion baja con cada problema y no pasa de cero", async () => {
    const malo = "todo: placeholder lorem ipsum";
    const r = await svc.validateOutput(malo, "seo", "clinicas");
    expect(r.score).toBeLessThan(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.valid).toBe(false);
  });

  it("`n/a` suelto se detecta, pero no dentro de una palabra", async () => {
    const conMarcador = `${BUENO} Resultado: n/a`;
    expect((await svc.validateOutput(conMarcador, "seo", "clinicas")).valid).toBe(false);

    // "internacional" contiene `n/a`? No, pero una URL como `dominio.com/na`
    // podria acercarse. Se comprueba que el texto bueno no salte.
    expect((await svc.validateOutput(BUENO, "seo", "clinicas")).valid).toBe(true);
  });
});
