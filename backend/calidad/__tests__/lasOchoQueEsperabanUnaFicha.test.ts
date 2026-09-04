/**
 * Las ocho comprobaciones que «necesitaban un modelo real» funcionan.
 *
 * ── QUÉ SE DEMUESTRA AQUÍ, Y QUÉ NO ─────────────────────────────────────────
 *
 * Ocho comprobaciones del motor no pueden dispararse hoy porque esperan una
 * FICHA —cuántas páginas, en qué paso aparece el precio, qué contraste tiene el
 * texto— y el agente devuelve prosa.
 *
 * La respuesta fácil era «hace falta un modelo real, así que no se puede hacer
 * nada». No es verdad. Lo único que hace falta de un modelo real es comprobar
 * que EMITE esta forma.
 *
 * Aquí se demuestra todo lo demás, y es casi todo:
 *
 *   · que cada comprobación DETECTA su fallo cuando la ficha llega bien;
 *   · que NO acusa cuando la pieza está bien;
 *   · que aguanta lo que un modelo devuelve de verdad: campos a medias, tipos
 *     equivocados, listas vacías, JSON que no es un objeto.
 *
 * Lo único que queda fuera se llama por su nombre:
 * `PROVIDER_REAL_OUTPUT_VERIFICATION`.
 *
 * ── LA DECISIÓN QUE MÁS IMPORTA ─────────────────────────────────────────────
 *
 * Un campo mal puesto NO invalida los otros siete. Rechazar la respuesta entera
 * porque un modelo devolvió un número donde iba una lista perdería trabajo
 * bueno, y perder trabajo por un campo malo es peor que no tener la ficha.
 *
 * COSTE EXTERNO: 0 EUR. Fixtures sintéticas, ningún modelo.
 */
import { describe, expect, it } from "vitest";

import { MotorDeCalidad, type Pieza } from "../MotorDeCalidad";
import { fichaDe, queTraeLaFicha, QUIEN_LEE_CADA_CAMPO } from "../contratoDeSalidaEstructurada";

const motor = new MotorDeCalidad();
const juzgar = (dominio: string, contenido: Record<string, unknown>) =>
  motor.evaluar({ dominio, autor: "productor", contenido }, "qa");
const hallazgo = (r: ReturnType<typeof juzgar>, id: string) =>
  r.hallazgos.find((h) => h.id === id);

describe("las ocho que esperaban una ficha", () => {
  // ── 1 · CANIBALIZACIÓN (seo) ──────────────────────────────────────────────

  it("detecta dos páginas peleando por la misma búsqueda", () => {
    const r = juzgar("seo", {
      paginas: [
        { objetivo: "precio implante dental", url: "/implantes" },
        { objetivo: "precio implante dental", url: "/precios" },
      ],
    });
    const h = hallazgo(r, "canibalizacion");
    expect(h, "dos páginas compitiendo pasaron sin decir nada").toBeDefined();
    expect(h!.quePasa).toMatch(/implante/);
  });

  it("y no acusa cuando cada una va a lo suyo", () => {
    const r = juzgar("seo", {
      paginas: [{ objetivo: "precio implante dental" }, { objetivo: "urgencias dentales" }],
    });
    expect(hallazgo(r, "canibalizacion")).toBeUndefined();
  });

  // ── 2 · UNA IDEA POR PANTALLA (web) ───────────────────────────────────────

  it("detecta dos llamadas principales compitiendo", () => {
    const r = juzgar("web", { ctasPrincipales: ["Pide cita", "Descarga la guía"] });
    expect(hallazgo(r, "una-idea-por-pantalla")).toBeDefined();
  });

  it("y una sola pasa", () => {
    expect(hallazgo(juzgar("web", { ctasPrincipales: ["Pide cita"] }), "una-idea-por-pantalla"))
      .toBeUndefined();
  });

  // ── 3 · FORMULARIO QUE PIDE DE MÁS (web) ──────────────────────────────────

  it("detecta un formulario que ahuyenta", () => {
    const r = juzgar("web", {
      camposDelFormulario: [
        { nombre: "nombre", obligatorio: true },
        { nombre: "apellidos", obligatorio: true },
        { nombre: "email", obligatorio: true },
        { nombre: "telefono", obligatorio: true },
        { nombre: "empresa", obligatorio: true },
        { nombre: "nif", obligatorio: true },
      ],
    });
    expect(hallazgo(r, "formulario-pide-lo-justo")).toBeDefined();
  });

  it("y uno corto no", () => {
    const r = juzgar("web", {
      camposDelFormulario: [
        { nombre: "nombre", obligatorio: true },
        { nombre: "telefono", obligatorio: true },
        { nombre: "mensaje", obligatorio: false },
      ],
    });
    expect(hallazgo(r, "formulario-pide-lo-justo")).toBeUndefined();
  });

  // ── 4 · CONTRASTE (creatividad) ───────────────────────────────────────────

  it("detecta un texto que no se lee", () => {
    const h = hallazgo(juzgar("creatividad", { contrasteTextoFondo: 2.1 }), "se-puede-leer-lo-que-pone");
    expect(h).toBeDefined();
    expect(h!.quePasa).toMatch(/4,5/);
  });

  it("y uno que sí, no", () => {
    expect(
      hallazgo(juzgar("creatividad", { contrasteTextoFondo: 7 }), "se-puede-leer-lo-que-pone"),
    ).toBeUndefined();
  });

  // ── 5 · EL PRECIO TARDE (ecommerce) ───────────────────────────────────────

  it("detecta el precio escondido hasta el final", () => {
    const h = hallazgo(
      juzgar("ecommerce", { pasoDondeApareceElPrecio: 4, pasosDelProceso: 5 }),
      "el-precio-no-aparece-tarde",
    );
    expect(h, "el precio en el paso 4 de 5 pasó sin decir nada").toBeDefined();
  });

  it("y el precio pronto no", () => {
    expect(
      hallazgo(
        juzgar("ecommerce", { pasoDondeApareceElPrecio: 1, pasosDelProceso: 5 }),
        "el-precio-no-aparece-tarde",
      ),
    ).toBeUndefined();
  });

  // ── 6 · GASTOS DE ENVÍO (ecommerce, BLOQUEANTE) ───────────────────────────

  it("BLOQUEA los gastos de envío enseñados en el pago", () => {
    // Es la primera causa de abandono de un carrito lleno.
    const h = hallazgo(
      juzgar("ecommerce", { cuandoSeMuestranGastosDeEnvio: "en el checkout" }),
      "gastos-de-envio-sin-sorpresas",
    );
    expect(h).toBeDefined();
    expect(h!.gravedad).toBe("bloqueante");
  });

  it("y enseñarlos en la ficha, no", () => {
    expect(
      hallazgo(
        juzgar("ecommerce", { cuandoSeMuestranGastosDeEnvio: "en la ficha de producto" }),
        "gastos-de-envio-sin-sorpresas",
      ),
    ).toBeUndefined();
  });

  // ── 7 · CUALIFICACIÓN (crm) ───────────────────────────────────────────────

  it("detecta que todo lead entra igual", () => {
    // Es lo que hace que ventas pierda el tiempo con quien nunca iba a comprar.
    expect(hallazgo(juzgar("crm", { criteriosDeCualificacion: [] }), "cualificacion-explicada"))
      .toBeDefined();
  });

  it("y con criterios, no", () => {
    expect(
      hallazgo(
        juzgar("crm", { criteriosDeCualificacion: ["más de 20 empleados", "presupuesto declarado"] }),
        "cualificacion-explicada",
      ),
    ).toBeUndefined();
  });

  // ── 8 · POR DÓNDE EMPIEZA EL INFORME (reporting) ──────────────────────────

  it("detecta un informe que empieza por lo que hicimos", () => {
    // Al cliente le importa qué consiguió, no cuántas horas echamos.
    const h = hallazgo(
      juzgar("reporting", { primeraSeccion: "Tareas realizadas durante el mes" }),
      "empieza-por-lo-que-el-cliente-queria",
    );
    expect(h).toBeDefined();
  });

  it("y uno que empieza por el resultado, no", () => {
    expect(
      hallazgo(
        juzgar("reporting", { primeraSeccion: "Objetivo del trimestre y resultado obtenido" }),
        "empieza-por-lo-que-el-cliente-queria",
      ),
    ).toBeUndefined();
  });

  // ── LO QUE UN MODELO DEVUELVE DE VERDAD ───────────────────────────────────

  describe("la ficha aguanta lo que un modelo devuelve de verdad", () => {
    it("VÁLIDA: se queda con todos los campos", () => {
      const f = fichaDe({
        paginas: [{ objetivo: "a" }],
        ctasPrincipales: ["Pide cita"],
        camposDelFormulario: [{ nombre: "email", obligatorio: true }],
        contrasteTextoFondo: 5.2,
        pasoDondeApareceElPrecio: 1,
        pasosDelProceso: 4,
        cuandoSeMuestranGastosDeEnvio: "en la ficha",
        criteriosDeCualificacion: ["presupuesto"],
        primeraSeccion: "Resultado",
      });
      expect(queTraeLaFicha(f).ausentes).toEqual([]);
    });

    it("PARCIAL: lo que llega se usa, lo que no se dice ausente", () => {
      const { presentes, ausentes } = queTraeLaFicha(fichaDe({ contrasteTextoFondo: 3 }));
      expect(presentes).toEqual(["contrasteTextoFondo"]);
      expect(ausentes.length).toBeGreaterThan(5);
    });

    it("MAL TIPADA: un campo malo NO invalida los otros siete", () => {
      // Es la decisión que más importa. Rechazar la respuesta entera porque el
      // modelo puso un número donde iba una lista perdería trabajo bueno.
      const f = fichaDe({
        ctasPrincipales: 42,
        contrasteTextoFondo: "mucho",
        primeraSeccion: "Resultado del trimestre",
      });
      expect(f.ctasPrincipales).toBeUndefined();
      expect(f.contrasteTextoFondo).toBeUndefined();
      expect(f.primeraSeccion, "se perdió un campo bueno por culpa de otro malo").toBe(
        "Resultado del trimestre",
      );
    });

    it("EL PRECIO VA EN PAREJA: un paso sin total no dice nada", () => {
      // «Paso 4» sin saber de cuántos no significa nada, y dejarlo pasar haría
      // creer que la ficha trae ese dato.
      const f = fichaDe({ pasoDondeApareceElPrecio: 4 });
      expect(f.pasoDondeApareceElPrecio).toBeUndefined();
      expect(f.pasosDelProceso).toBeUndefined();
    });

    it("LISTA VACÍA: se conserva, porque «ninguno» es la respuesta que se busca", () => {
      // `criteriosDeCualificacion: []` es exactamente lo que una comprobación
      // quiere detectar. Descartarla la dejaría sin nada que mirar.
      expect(fichaDe({ criteriosDeCualificacion: [] }).criteriosDeCualificacion).toEqual([]);
    });

    it("MAL FORMADA: un array, un número o `null` no rompen nada", () => {
      for (const basura of [null, undefined, 42, "texto", [1, 2, 3]]) {
        expect(queTraeLaFicha(fichaDe(basura)).presentes).toEqual([]);
      }
    });

    it("VACÍA: ninguna comprobación acusa a nadie", () => {
      // Sin ficha, las ocho dicen «no se pudo comprobar». Es la verdad, y es
      // mejor que un veredicto inventado.
      for (const d of ["web", "seo", "ecommerce", "crm", "reporting", "creatividad"]) {
        const r = juzgar(d, {});
        for (const id of Object.values(QUIEN_LEE_CADA_CAMPO)) {
          expect(hallazgo(r, id), `${d}.${id} acusó sin ficha`).toBeUndefined();
        }
      }
    });
  });

  it("EL CONTRATO: cada campo declara qué comprobación lo lee", () => {
    // Un campo que no lee nadie sobra; una comprobación que lee algo que no está
    // en el contrato no puede dispararse. Es el fallo que costó estas ocho.
    for (const [campo, comprobacion] of Object.entries(QUIEN_LEE_CADA_CAMPO)) {
      expect(comprobacion.length, `${campo} no declara quién lo lee`).toBeGreaterThan(3);
    }
    expect(Object.keys(QUIEN_LEE_CADA_CAMPO).length).toBe(9);
  });
});
