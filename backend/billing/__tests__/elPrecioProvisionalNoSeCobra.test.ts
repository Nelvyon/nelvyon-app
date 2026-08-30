/**
 * EL PRECIO PROVISIONAL NO SE COBRA.
 *
 * EL PROBLEMA. Se han añadido cuatro servicios al catálogo y nadie ha decidido
 * todavía cuánto valen. Un servicio necesita un importe para existir en las
 * estructuras que lo rodean, así que hay uno puesto — y ese es exactamente el
 * peligro: una cifra puesta para que compile es indistinguible, seis meses
 * después, de una cifra que alguien decidió. La primera vez que se le pase a
 * una pasarela, se cobra.
 *
 * LA DEFENSA. `precioFacturable()` devuelve `null` cuando el precio está
 * marcado como pendiente. Y como una función que nadie usa no defiende nada,
 * la última prueba de este fichero recorre el árbol para comprobar que ningún
 * sitio del código de producción lee el importe por su cuenta.
 *
 * POR QUÉ ESTO NO ES UNA DECISIÓN QUE PUEDA TOMAR CLAUDE. Un precio no sale de
 * la arquitectura: sale de lo que cuesta prestar el servicio y de lo que el
 * mercado paga. Inventarlo es exactamente el tipo de cosa que la directiva
 * marca como BUSINESS_DECISION_REQUIRED.
 *
 * COSTE EXTERNO: 0 €.
 *
 * POR QUE LA ULTIMA LLEVA UN PLAZO EXPLICITO.
 *
 * Recorren el arbol entero leyendo ficheros. Eso tarda segundos de verdad, no
 * milisegundos, y el plazo por defecto de vitest —cinco segundos— esta pensado
 * para una prueba unitaria, no para una auditoria del codigo fuente.
 *
 * Con la suite entera en paralelo, siete comprobaciones de esta familia
 * empezaron a fallar por plazo agotado mientras pasaban una a una. Eso es lo
 * peor que le puede pasar a una prueba: enseña a relanzarla en vez de a mirar,
 * y a partir de ahi un fallo de verdad se confunde con «hoy iba lento».
 *
 * El plazo no oculta nada: el trabajo se sigue haciendo entero y la
 * comprobacion sigue siendo la misma. Lo unico que cambia es que se le da el
 * tiempo que necesita.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  PREMIUM_PRODUCTS,
  getPremiumProduct,
  precioFacturable,
  serviciosSinPrecioDefinitivo,
} from "../premiumProducts";
import { OS_PREMIUM_SERVICE_IDS } from "../../os-agents/constants";

/** Plazo del fichero: recorre el arbol. El porque, en `nelvyonEsLaAgencia`. */
vi.setConfig({ testTimeout: 60_000 });

const RAIZ = path.resolve(__dirname, "..", "..", "..");

/** Ficheros de producción: se excluyen pruebas, scripts y dependencias. */
function ficherosDeProduccion(): string[] {
  const salida: string[] = [];
  const ignorados = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage", "scripts"]);
  const recorrer = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || ignorados.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "__tests__") continue;
        recorrer(p);
        continue;
      }
      if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) continue;
      salida.push(p);
    }
  };
  recorrer(path.join(RAIZ, "backend"));
  recorrer(path.join(RAIZ, "apps", "web", "src"));
  return salida;
}

describe("el precio provisional no se cobra", () => {
  it("todos los servicios del catálogo tienen ficha de producto", () => {
    // Denominador derivado: si mañana entra un servicio nuevo y nadie le pone
    // ficha, esta prueba lo dice en vez de que se descubra al facturar.
    const sinFicha = OS_PREMIUM_SERVICE_IDS.filter((id) => !getPremiumProduct(id));
    expect(sinFicha, `servicios sin ficha de producto: ${sinFicha.join(", ")}`).toEqual([]);
  });

  it("un precio marcado como pendiente NO es facturable", () => {
    const pendientes = serviciosSinPrecioDefinitivo();
    expect(pendientes.length, "no queda ningún precio pendiente y esta prueba ya no vigila nada").toBeGreaterThan(0);

    for (const id of pendientes) {
      expect(precioFacturable(id), `${id} devuelve un importe cobrable con el precio sin decidir`).toBeNull();
      // Y la ficha sigue teniendo importe: el objetivo no es que no haya cifra,
      // es que la cifra que hay no llegue nunca a una pasarela.
      expect(getPremiumProduct(id)?.amount).toBeTypeOf("number");
    }
  });

  it("un precio decidido SÍ es facturable", () => {
    // El control positivo. Sin él, `precioFacturable()` podría devolver `null`
    // siempre y la prueba de arriba seguiría en verde mientras el sistema deja
    // de poder cobrar absolutamente nada.
    const decididos = Object.keys(PREMIUM_PRODUCTS).filter(
      (id) => !PREMIUM_PRODUCTS[id as keyof typeof PREMIUM_PRODUCTS].precioPendiente,
    );
    expect(decididos.length).toBeGreaterThan(20);

    for (const id of decididos) {
      const importe = precioFacturable(id);
      expect(importe, `${id} tiene precio decidido y no se puede facturar`).not.toBeNull();
      expect(importe).toBe(getPremiumProduct(id)?.amount);
      expect(importe as number).toBeGreaterThan(0);
    }
  });

  it("`serviciosSinPrecioDefinitivo()` coincide con lo que dicen las fichas", () => {
    const desdeLasFichas = Object.entries(PREMIUM_PRODUCTS)
      .filter(([, p]) => p.precioPendiente === true)
      .map(([id]) => id)
      .sort();
    expect(serviciosSinPrecioDefinitivo().sort()).toEqual(desdeLasFichas);
  });

  it("nadie lee el importe por su cuenta en código de producción", () => {
    // LA PARTE QUE DE VERDAD DEFIENDE. Las tres pruebas anteriores comprueban
    // que la puerta cierra; ésta comprueba que no hay una ventana al lado.
    // Cualquier `.amount` leído directamente de una ficha se salta el guardián.
    const infractores: string[] = [];
    for (const f of ficherosDeProduccion()) {
      if (f.endsWith(path.join("billing", "premiumProducts.ts"))) continue;
      const t = fs.readFileSync(f, "utf8");
      if (!/getPremiumProduct|PREMIUM_PRODUCTS/.test(t)) continue;
      const linea = t
        .split(/\r?\n/)
        .findIndex((l) => /(getPremiumProduct\([^)]*\)|PREMIUM_PRODUCTS\[[^\]]*\])\??\.amount/.test(l));
      if (linea >= 0) infractores.push(`${path.relative(RAIZ, f)}:${linea + 1}`);
    }
    expect(
      infractores,
      `leen el importe sin pasar por precioFacturable(): ${infractores.join(", ")}`,
    ).toEqual([]);
  });
});
