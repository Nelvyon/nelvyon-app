/**
 * NINGUNA PRUEBA SE SALTA SIN UNA RAZÓN ESCRITA.
 *
 * POR QUÉ HACE FALTA. La suite dice «976 skipped» y ese número no significa
 * nada por sí solo. Puede ser cobertura de integración esperando una base
 * —correcto— o pruebas que alguien desactivó y nadie volvió a mirar. Las dos
 * cosas se ven EXACTAMENTE IGUAL en el resumen.
 *
 * Un `skip` es la forma más silenciosa de perder cobertura: la suite sigue
 * verde, el contador de fallos sigue en cero, y la prueba lleva meses sin
 * ejecutarse.
 *
 * QUÉ HAY YA, Y QUÉ AÑADE ESTO. `skipsAreGated.test.ts` vigila la FORMA: que no
 * exista un `describe.skip(` sin condición. Eso cubre el caso más burdo. Lo que
 * faltaba era clasificar los saltos CONDICIONADOS por su razón, que es el 97 %
 * de ellos.
 *
 * RESULTADO MEDIDO sobre 999 ficheros de prueba y 99 puntos de salto:
 *
 *     97  ENTORNO_AUSENTE    PostgreSQL o el modelo local no están levantados
 *      2  SOLO_PRODUCCION    sólo tienen sentido contra producción
 *      0  sin razón visible
 *
 * Es un resultado POSITIVO: los saltos están bien puestos. No son cobertura
 * perdida, es infraestructura ausente. Y esos 97 volverían a ejecutarse en
 * cuanto hubiera una base local — se comprobó: hoy no hay nada escuchando en
 * 5432, 5433 ni 5434, y Docker Desktop no responde.
 *
 * COSTE EXTERNO: 0 €. Lee ficheros; no ejecuta ninguna prueba ni levanta nada.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  clasificar,
  ficherosDePrueba,
  resolverNombre,
  saltosDe,
} from "../../../scripts/por-que-se-salta-esta-prueba.mjs";

const RAIZ = path.resolve(__dirname, "..", "..", "..");

describe("el clasificador lee la razón, no el nombre de la variable", () => {
  it("LA REGLA: sigue el hilo de un identificador hasta su definición", () => {
    /**
     * SIN ESTO LA HERRAMIENTA NO SIRVE. La forma real de este repositorio es
     * `const conBase = DSN ? describe : describe.skip`, donde la condición es
     * `DSN` — un nombre, no una razón. La primera versión clasificó 96 de 102
     * saltos como «sin clasificar», que es lo mismo que no clasificar nada.
     */
    const fuente = `
      const DSN = process.env.NELVYON_PG_CERT_DSN ?? "";
      const conBase = DSN ? describe : describe.skip;
      conBase("algo", () => {});`;
    const saltos = saltosDe("f.test.ts", fuente);
    expect(saltos).toHaveLength(1);
    expect(saltos[0].clase).toBe("ENTORNO_AUSENTE");
  });

  it("y a través de dos saltos de indirección", () => {
    const fuente = `
      const DSN = process.env.DATABASE_URL ?? "";
      const hayBase = Boolean(DSN);
      const soloConBase = hayBase ? describe : describe.skip;
      soloConBase("algo", () => {});`;
    expect(saltosDe("f.test.ts", fuente)[0].clase).toBe("ENTORNO_AUSENTE");
  });

  it("resolverNombre trae la definición, no el nombre", () => {
    const fuente = 'const DSN = process.env.NELVYON_PG_CERT_DSN ?? "";';
    expect(resolverNombre(fuente, "DSN")).toContain("NELVYON_PG_CERT_DSN");
  });

  it("EL CONTROL POSITIVO: un `describe.skip` a secas es SIN_RAZON_VISIBLE", () => {
    // El caso que de verdad importa: nadie escribió por qué.
    const saltos = saltosDe("f.test.ts", 'describe.skip("apagado", () => {});');
    expect(saltos).toHaveLength(1);
    expect(saltos[0].clase).toBe("SIN_RAZON_VISIBLE");
  });

  it("clasificar distingue el entorno del proveedor de pago", () => {
    // La distinción importa: uno se arregla levantando algo, el otro cuesta
    // dinero y está prohibido activarlo.
    expect(clasificar("process.env.NELVYON_PG_CERT_DSN")).toBe("ENTORNO_AUSENTE");
    expect(clasificar("process.env.OPENAI_API_KEY")).toBe("PROVEEDOR_EXTERNO");
    expect(clasificar("")).toBe("SIN_RAZON_VISIBLE");
  });

  it("la inferencia local cuenta como ENTORNO, no como proveedor de pago", () => {
    // Corre sobre hardware que ya existe y no factura nada. Meterla con los
    // proveedores daría a entender que cuesta dinero levantarla.
    expect(clasificar("process.env.OLLAMA_HOST")).toBe("ENTORNO_AUSENTE");
    expect(clasificar("hayModelo")).toBe("ENTORNO_AUSENTE");
  });
});

describe("el repositorio entero no tiene saltos sin razón", () => {
  const ficheros = ficherosDePrueba(RAIZ);

  it("el denominador no es cero: un cero aquí sería un aprobado falso", () => {
    expect(ficheros.length).toBeGreaterThan(500);
  });

  it("EL CONTROL: no se acusa al vigilante, ni a esta misma prueba", () => {
    /**
     * ACUSAR AL VIGILANTE es el falso positivo más tonto posible, y aquí pasó
     * dos veces:
     *
     *   · `skipsAreGated.test.ts` busca `describe.skip(` sin condición, así que
     *     sus cadenas de detección SON el patrón que busca;
     *   · y esta misma prueba, que necesita un `describe.skip` de ejemplo para
     *     su control positivo de ahí arriba.
     *
     * LA SEGUNDA ENSEÑÓ ALGO PEOR. Pasó al ejecutarla sola y falló en la suite
     * completa, porque `git ls-files` no lista un fichero hasta que se
     * consolida: **el veredicto dependía de si estaba commiteada**. Una prueba
     * que cambia de resultado al hacer `git add` no mide lo que cree medir.
     *
     * La exclusión es una regla general —un fichero que IMPORTA la herramienta
     * habla de ella— y no una lista de nombres, que habría que ampliar cada vez
     * y que fallaría el día que alguien se olvidara.
     */
    expect(ficheros.some((f: string) => /skipsAreGated/.test(f))).toBe(false);
    expect(ficheros.some((f: string) => /ningunaPruebaSeSaltaSinRazon/.test(f))).toBe(false);
  });

  it("LA REGLA: cada salto tiene una razón clasificable", () => {
    const sospechosos: string[] = [];
    for (const rel of ficheros) {
      const abs = path.join(RAIZ, rel);
      if (!fs.existsSync(abs)) continue;
      for (const s of saltosDe(rel, fs.readFileSync(abs, "utf8"))) {
        if (s.clase === "SIN_RAZON_VISIBLE" || s.clase === "CONDICIONAL_SIN_CLASIFICAR") {
          sospechosos.push(`${s.fichero}:${s.linea}  ${s.forma}  «${s.condicion}»`);
        }
      }
    }
    expect(
      sospechosos,
      `saltos sin razon escrita o sin clasificar:\n${sospechosos.join("\n")}`,
    ).toEqual([]);
  });

  it("y se encuentran saltos de verdad: no es que no haya ninguno", () => {
    // Un «0 sospechosos» de 0 saltos encontrados no dice nada. Tiene que haber
    // saltos, y todos con razón.
    let total = 0;
    for (const rel of ficheros) {
      const abs = path.join(RAIZ, rel);
      if (!fs.existsSync(abs)) continue;
      total += saltosDe(rel, fs.readFileSync(abs, "utf8")).length;
    }
    expect(total).toBeGreaterThan(50);
  });
});
