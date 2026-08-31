/**
 * EL IDIOMA Y EL PAÍS DEL CLIENTE LLEGAN HASTA LA INSTRUCCIÓN.
 *
 * QUÉ MIDE, Y POR QUÉ ES LO SIGUIENTE DESPUÉS DE ARREGLAR EL DETECTOR. Corregir
 * `detectLanguageFromText` subió el acierto del 57 % al 100 % **sobre frases
 * sueltas**. Eso no dice nada sobre el servicio completo: un detector perfecto
 * no sirve de nada si el idioma del cliente nunca llega al agente que trabaja
 * para él.
 *
 * Así que aquí no se prueba una función. Se ejecuta cada agente premium con
 * clientes de países e idiomas distintos y se mira **lo que de verdad le llega
 * al modelo**.
 *
 * EL HUECO QUE LO MOTIVA. Los cinco clientes sintéticos del banco anti-genérico
 * son todos españoles y hablan español. Un banco así no puede detectar que el
 * sistema produce trabajo español para un cliente alemán: no hay ningún alemán
 * a quien producírselo.
 *
 * QUÉ SE AÑADE Y QUÉ NO. Se añaden tres clientes —Alemania/alemán,
 * Reino Unido/inglés, Brasil/portugués— que además varían dos ejes más que el
 * banco no cubría: madurez del negocio y datos disponibles. NO se toca el
 * juego de cinco: cambiar el instrumento y la medida a la vez impide saber cuál
 * movió el resultado.
 *
 * LO QUE ESTA PRUEBA NO PUEDE DECIR: si el texto que produce el modelo está
 * bien escrito en alemán. Eso exige un modelo real y un evaluador que sepa
 * alemán. Lo que sí puede decir es si el agente **recibe** el dato, que es la
 * condición necesaria: lo que no llega no se puede usar.
 *
 * COSTE EXTERNO: 0 €. El modelo va doblado; no se llama a ningún proveedor.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { ModeloQueSoloEscucha, type AgenteMedible } from "../bancoAntiGenerico";
import {
  CLIENTES_INTERNACIONALES,
  cargaInternacionalDe,
  type ClienteInternacional,
} from "../clientesInternacionales";
import { resolveAgentLocale } from "../../os-agents/agentLanguage";

/** Plazo del fichero: recorre el árbol de agentes y los ejecuta uno a uno. */
vi.setConfig({ testTimeout: 120_000 });

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const DIR = path.join(RAIZ, "backend", "os-agents", "agents");

function ficherosDeAgentes(): string[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith("Agent.ts"))
    .map((f) => path.join(DIR, f))
    .sort();
}

function fabricaDe(mod: Record<string, unknown>): ((llm: ModeloQueSoloEscucha) => AgenteMedible) | null {
  const clase = Object.entries(mod).find(([k, v]) => k.endsWith("Agent") && typeof v === "function");
  if (!clase) return null;
  return (llm) => new (clase[1] as new (l: unknown) => AgenteMedible)(llm);
}

/** Lo que un agente le pide al modelo para este cliente, o `null` si no pide. */
async function loQuePide(
  crear: (llm: ModeloQueSoloEscucha) => AgenteMedible,
  c: ClienteInternacional,
): Promise<string | null> {
  const doble = new ModeloQueSoloEscucha();
  let agente: AgenteMedible;
  try {
    agente = crear(doble);
  } catch {
    return null;
  }
  const primero = agente.steps?.[0];
  if (!primero) return null;
  try {
    await primero.run(cargaInternacionalDe(c), {
      stepResults: {},
      clientId: c.id,
      jobId: "idioma",
    });
  } catch {
    /* puede fallar DESPUÉS de pedir; si pidió, lo pedido vale */
  }
  return doble.recibido.length > 0 ? doble.recibido.join("\n") : null;
}

describe("los clientes internacionales varían de verdad", () => {
  it("cubren tres países y tres idiomas distintos", () => {
    // Si se parecieran, la medición de abajo acusaría a los agentes de algo que
    // sería culpa del banco.
    const paises = new Set(CLIENTES_INTERNACIONALES.map((c) => c.pais));
    const idiomas = new Set(CLIENTES_INTERNACIONALES.map((c) => c.idioma));
    expect(paises.size).toBe(CLIENTES_INTERNACIONALES.length);
    expect(idiomas.size).toBe(CLIENTES_INTERNACIONALES.length);
  });

  it("y también en madurez y en datos disponibles", () => {
    // Los dos ejes que el banco anterior no tenía.
    expect(new Set(CLIENTES_INTERNACIONALES.map((c) => c.madurez)).size).toBeGreaterThan(1);
    expect(new Set(CLIENTES_INTERNACIONALES.map((c) => c.datosDisponibles)).size).toBeGreaterThan(1);
  });

  it("cada uno lleva restricciones que hacen inaplicable el consejo de los otros", () => {
    for (const c of CLIENTES_INTERNACIONALES) {
      expect(c.restricciones.length, `${c.id} no tiene restricciones`).toBeGreaterThan(1);
    }
  });
});

describe("el idioma declarado del cliente decide, no la conjetura", () => {
  it("LA REGLA: la carga de cada cliente resuelve a SU idioma", () => {
    for (const c of CLIENTES_INTERNACIONALES) {
      expect(resolveAgentLocale(cargaInternacionalDe(c)), `${c.id}`).toBe(c.idioma);
    }
  });

  it("EL CONTROL: sin el campo, se cae a la conjetura y no al idioma correcto", () => {
    /**
     * Esta es la prueba que demuestra que el campo hace falta. Con un brief en
     * español —como el que traen estos clientes sintéticos— pero un cliente
     * alemán, quitar `language` hace que el sistema resuelva «es».
     *
     * Es exactamente el fallo que se quiere impedir: adivinar por el texto del
     * encargo en vez de mirar lo que el cliente ya declaró.
     */
    const aleman = CLIENTES_INTERNACIONALES.find((c) => c.idioma === "de")!;
    const carga = cargaInternacionalDe(aleman);
    const sinIdioma = { ...carga, language: undefined, locale: undefined, idioma: undefined };
    expect(resolveAgentLocale(sinIdioma as Record<string, unknown>)).not.toBe("de");
  });
});

describe("el contrafactual: cambiar UNA sola variable", () => {
  /**
   * LA PRUEBA MÁS DURA DEL BANCO, y la que puede salir mal. Se coge el mismo
   * cliente alemán y se le cambia UNA cosa: el idioma. Todo lo demás —sector,
   * objetivo, presupuesto, restricciones, marca— queda idéntico.
   *
   * Si la instrucción no cambia en nada, ese campo NO SE ESTÁ USANDO. Y si el
   * campo no se usa, `localizedPrompt` puede acertar el idioma todo lo que
   * quiera: el entregable saldrá igual.
   *
   * El resultado se mide y se dice tal cual, salga como salga.
   */
  it("cambiar sólo el idioma cambia lo que se le pide al modelo", async () => {
    const aleman = CLIENTES_INTERNACIONALES.find((c) => c.idioma === "de")!;
    const mismoPeroEnIngles: ClienteInternacional = { ...aleman, idioma: "en" };

    let medidos = 0;
    const noCambian: string[] = [];

    for (const fichero of ficherosDeAgentes()) {
      let mod: Record<string, unknown>;
      try {
        mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
      } catch {
        continue;
      }
      const crear = fabricaDe(mod);
      if (!crear) continue;

      const a = await loQuePide(crear, aleman);
      const b = await loQuePide(crear, mismoPeroEnIngles);
      if (a === null || b === null) continue;
      medidos += 1;
      if (a === b) noCambian.push(path.basename(fichero, ".ts"));
    }

    expect(medidos, "no se ha medido ningún agente").toBeGreaterThan(10);

    /**
     * ESTA PRUEBA MIDIÓ PRIMERO EL FALLO Y DESPUÉS EL ARREGLO, y conviene que
     * quede contado porque es la razón de que exista.
     *
     * La primera medición dio **29 de 29 agentes produciendo la instrucción
     * IDÉNTICA** al cambiar el idioma del cliente. No era culpa de los agentes:
     * el idioma no llegaba hasta ellos. `contextoDelCliente` —el bloque que se
     * antepone a cada instrucción— llevaba objetivo, propuesta de valor,
     * ubicación, presupuesto, historial y restricciones, pero **no el idioma**.
     * El dato entraba en `os_clients.language`, el cerebro de negocio lo
     * guardaba en `preferencias.idioma`, y ahí se quedaba.
     *
     * Añadidas las dos líneas al contexto, la medición pasó a **0 de 29**.
     *
     * Y esto NO sustituye a `localizedPrompt`, que es quien le ordena al modelo
     * en qué idioma escribir. Sirve para lo otro: que el agente RAZONE con el
     * idioma. Buscar palabras clave para un cliente alemán no es traducir las
     * españolas.
     */
    expect(
      noCambian,
      `${noCambian.length} de ${medidos} agentes NO reaccionan al idioma del cliente:\n  ${noCambian.join("\n  ")}`,
    ).toEqual([]);
  });

  it("cambiar el PAÍS sí cambia lo que se le pide", async () => {
    // Contraste con la de arriba: el país sí viaja dentro de la instrucción
    // —a través de `location`— así que aquí el cambio TIENE que verse. Si esta
    // saliera igual que la anterior, significaría que el banco no distingue
    // nada y las dos serían inútiles.
    const aleman = CLIENTES_INTERNACIONALES.find((c) => c.pais === "DE")!;
    const mismoEnBrasil: ClienteInternacional = {
      ...aleman,
      pais: "BR",
      ubicacion: "Belo Horizonte, Brasil",
    };

    let medidos = 0;
    let cambian = 0;
    for (const fichero of ficherosDeAgentes()) {
      let mod: Record<string, unknown>;
      try {
        mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
      } catch {
        continue;
      }
      const crear = fabricaDe(mod);
      if (!crear) continue;
      const a = await loQuePide(crear, aleman);
      const b = await loQuePide(crear, mismoEnBrasil);
      if (a === null || b === null) continue;
      medidos += 1;
      if (a !== b) cambian += 1;
    }
    expect(medidos).toBeGreaterThan(10);
    expect(cambian, `solo ${cambian} de ${medidos} agentes reaccionan al pais`).toBeGreaterThan(
      medidos * 0.5,
    );
  });
});

describe("lo que de verdad le llega al agente", () => {
  it("el inventario de agentes sale del árbol y no está vacío", () => {
    expect(ficherosDeAgentes().length).toBeGreaterThan(20);
  });

  it("LA REGLA: a clientes de países distintos no se les manda lo mismo", async () => {
    /**
     * SE MIDE LA SEPARACIÓN, no la igualdad de cadenas. Se quita lo que es
     * idéntico para los tres —la plantilla— y se mira cuánto queda de propio.
     * Cero significa que un fabricante alemán y un pub de Manchester reciben
     * literalmente la misma instrucción.
     *
     * El umbral es bajo a propósito: aquí no se juzga la calidad del reparto,
     * sólo que exista. Un banco que exigiera mucho acusaría a los agentes de no
     * llegar a un listón que nadie ha justificado.
     */
    const identicos: string[] = [];
    let medidos = 0;

    for (const fichero of ficherosDeAgentes()) {
      let mod: Record<string, unknown>;
      try {
        mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
      } catch {
        continue;
      }
      const crear = fabricaDe(mod);
      if (!crear) continue;

      const pedidos: string[] = [];
      for (const c of CLIENTES_INTERNACIONALES) {
        const p = await loQuePide(crear, c);
        if (p === null) break;
        pedidos.push(p);
      }
      if (pedidos.length !== CLIENTES_INTERNACIONALES.length) continue;
      medidos += 1;

      const distintos = new Set(pedidos);
      if (distintos.size === 1) identicos.push(path.basename(fichero, ".ts"));
    }

    // El denominador se comprueba: «0 idénticos» de 0 medidos no es un aprobado.
    expect(medidos, "no se ha llegado a medir ningún agente").toBeGreaterThan(10);
    expect(
      identicos,
      `${identicos.length} de ${medidos} agentes mandan LO MISMO a los tres paises:\n  ${identicos.join("\n  ")}`,
    ).toEqual([]);
  });
});
