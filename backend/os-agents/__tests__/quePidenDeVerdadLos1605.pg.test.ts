/**
 * QUÉ PIDEN DE VERDAD LOS 1.605 AGENTES SECTORIALES.
 *
 * LO QUE YA SE SABÍA, Y POR QUÉ NO BASTA. La caracterización por CÓDIGO FUENTE
 * dice que los 1.605 encajan en tres familias y que no hay ninguno rebelde. Eso
 * responde «¿están todos escritos igual?». No responde la pregunta que importa:
 *
 *     ¿HACEN COSAS DISTINTAS, O SON EL MISMO AGENTE 1.605 VECES?
 *
 * Dos ficheros escritos con la misma plantilla pueden producir instrucciones
 * completamente distintas —porque el cuerpo se elige por `agentId`— o
 * exactamente las mismas. Desde la fuente no se distingue, y la diferencia
 * decide si aquí hay 1.605 capacidades o una repetida.
 *
 * CÓMO SE MIDE AQUÍ. Se ejecuta cada agente con un modelo de mentira que no
 * responde nada: SE QUEDA CON LA INSTRUCCIÓN QUE RECIBE. Todos los agentes
 * reciben EL MISMO input. Lo que se compara es la instrucción resultante.
 *
 *   · misma instrucción  → mismo comportamiento. Son redundantes de verdad, y
 *                          eso se puede afirmar, no suponer.
 *   · distinta           → son agentes distintos, y colapsarlos perdería
 *                          trabajo. Aunque el fichero parezca calcado.
 *
 * NO SE MIGRA NADA AQUÍ. Esta prueba MIDE. La directiva dice migrar sólo donde
 * la equivalencia esté probada, y probarla es el paso que faltaba: fusionar
 * primero y comprobar después es cómo se pierden 1.605 matices de una vez.
 *
 * COSTE EXTERNO: 0 €. El modelo nunca se llama.
 */
import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Plazo del fichero: recorre el arbol. El porque, en `nelvyonEsLaAgencia`. */
vi.setConfig({ testTimeout: 60_000 });


const RAIZ = path.resolve(__dirname, "..", "..", "..");
const SECTORES = path.join(RAIZ, "backend", "os-agents", "sectors");

/** El inventario SALE DEL ÁRBOL. Una lista a mano se queda vieja y miente. */
function ficherosDeAgentes(dir: string): string[] {
  const fuera: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue;
      fuera.push(...ficherosDeAgentes(p));
    } else if (e.name.endsWith("Agent.ts")) {
      fuera.push(p);
    }
  }
  return fuera.sort();
}

/**
 * El modelo de mentira.
 *
 * No genera: RECOGE. Devuelve siempre el mismo JSON válido para que el agente
 * complete su camino sin fallar, y guarda la instrucción que le llegó, que es
 * lo único que se está midiendo.
 *
 * Que la respuesta sea idéntica para todos es deliberado: si variase, dos
 * agentes idénticos podrían parecer distintos por culpa del doble.
 */
class ModeloQueSoloEscucha {
  readonly recibido: string[] = [];

  async complete(prompt: string): Promise<string> {
    this.recibido.push(prompt);
    return JSON.stringify({
      result: "respuesta fija del doble",
      insights: ["fijo"],
      recommendedActions: ["fijo"],
    });
  }
}

/**
 * La misma entrada para los 1.605.
 *
 * Los campos NO están inventados: salen de los `Input` que declaran los
 * `shared.ts` de cada sector, contados por frecuencia. La primera versión sólo
 * traía cinco y 431 agentes reventaban leyendo `.length` de algo que no venía
 * — no porque estuvieran rotos, sino porque se les llamaba mal.
 *
 * Lo importante para lo que se mide: TODOS reciben exactamente esto. Si dos
 * agentes producen la misma instrucción con la misma entrada, son equivalentes
 * de verdad. Si un campo sobra para uno, sobra igual para el que se le compara.
 */
const ENTRADA = {
  userId: "00000000-0000-4000-8000-000000000001",
  sector: "fisioterapia",
  brand: "Clínica Getafe",
  businessName: "Clínica Getafe",
  businessContext: "Clínica de fisioterapia en Getafe, 3 fisios, cita previa",
  businessType: "clínica",
  serviceType: "fisioterapia",
  clientName: "Clínica Getafe",
  targetAudience: "adultos 30-60 con dolor de espalda",
  targetClient: "adultos 30-60 con dolor de espalda",
  targetMarket: "Madrid sur",
  productType: "sesiones de fisioterapia",
  tone: "cercano y profesional",
  location: "Getafe, Madrid",
  countryCode: "ES",
  planType: "estandar",
  targets: ["recuperación postoperatoria", "dolor lumbar"],
  services: ["fisioterapia deportiva", "rehabilitación"],
  metricsBrief: "42 citas/mes, ticket 45 €, ocupación 68 %",
  verticalBrief: "clínica pequeña, sin equipo de marketing",
  realDataContext: "",
  metadata: {},
  seedIndex: 0,
  siteUrl: "https://ejemplo.es",
  domain: "ejemplo.es",
  url: "https://ejemplo.es",
};

const huella = (s: string): string => createHash("sha256").update(s).digest("hex").slice(0, 16);

interface Medicion {
  fichero: string;
  agente: string;
  estado: "medido" | "no_ejecutable";
  huellaInstruccion?: string;
  motivo?: string;
}

// El limite de palabra va con UNA barra. Escrito con dos, el patron exige
// una barra invertida literal despues de `class` y no casa con ninguna
// clase — con lo que la deteccion se cae en silencio a la fabrica.
const ES_CLASE = /^\s*class\b/;

/**
 * Ejecuta un agente y devuelve la huella de lo que pidio.
 *
 * TRES FORMAS, no una. El primer intento buscaba `getXAgent().execute()` y solo
 * midio 40 de 1.605: esa es la forma de la familia `ads`, no la del arbol. Las
 * otras 1.565 exportan la clase directamente, aceptan `{ llm }` en el
 * constructor y el metodo se llama `run(userId, input)`.
 *
 * Que el primer intento midiera el 2,5 % y el guardarrail lo parase es
 * exactamente para lo que esta el guardarrail: una equivalencia calculada sobre
 * cuarenta agentes y presentada como si fuera de mil seiscientos seria una
 * afirmacion falsa con pinta de dato.
 *
 * Un agente que no se puede ejecutar NO cuenta como equivalente a nada. Se
 * marca `no_ejecutable` y se queda fuera del recuento: meterlo en un grupo
 * junto a los que si corrieron inventaria una equivalencia que nadie ha medido.
 */
async function medir(fichero: string, doble: ModeloQueSoloEscucha): Promise<Medicion> {
  const rel = path.relative(RAIZ, fichero).replace(/\\\\/g, "/");
  const nombre = path.basename(fichero, ".ts");

  let mod: Record<string, unknown>;
  try {
    mod = (await import(/* @vite-ignore */ fichero)) as Record<string, unknown>;
  } catch (e) {
    return { fichero: rel, agente: nombre, estado: "no_ejecutable", motivo: `no importa: ${(e as Error).message.slice(0, 90)}` };
  }

  const antes = doble.recibido.length;

  try {
    const instancia = construir(mod, doble);
    if (!instancia) {
      return { fichero: rel, agente: nombre, estado: "no_ejecutable", motivo: "no se pudo instanciar" };
    }

    const metodo = ["run", "execute", "generate"].find(
      (m) => typeof (instancia as Record<string, unknown>)[m] === "function",
    );
    if (!metodo) {
      return { fichero: rel, agente: nombre, estado: "no_ejecutable", motivo: "sin metodo run/execute/generate" };
    }

    const fn = (instancia as Record<string, (...a: unknown[]) => Promise<unknown>>)[metodo];
    // `run(userId, input)` frente a `execute(input)`: la aridad lo dice.
    const args = fn.length >= 2 ? [ENTRADA.userId, ENTRADA] : [ENTRADA];
    await fn.apply(instancia, args);
  } catch (e) {
    // Puede fallar DESPUES de haber pedido: si pidio, la medicion vale.
    if (doble.recibido.length === antes) {
      return {
        fichero: rel, agente: nombre, estado: "no_ejecutable",
        motivo: `falla sin llegar a pedir: ${(e as Error).message.slice(0, 90)}`,
      };
    }
  }

  const nuevas = doble.recibido.slice(antes);
  if (nuevas.length === 0) {
    return { fichero: rel, agente: nombre, estado: "no_ejecutable", motivo: "no pidio nada al modelo" };
  }
  return { fichero: rel, agente: nombre, estado: "medido", huellaInstruccion: huella(nuevas.join("\n---\n")) };
}

/**
 * Consigue una instancia del agente, por la via que sea.
 *
 * Se prefiere el constructor con `{ llm }` inyectado: es la forma mas directa
 * de garantizar que el doble intercepta. La fabrica `getXAgent()` es el
 * respaldo para la familia que esconde el constructor.
 */
function construir(mod: Record<string, unknown>, doble: ModeloQueSoloEscucha): object | null {
  const clase = Object.entries(mod).find(
    ([k, v]) => k.endsWith("Agent") && typeof v === "function" && ES_CLASE.test(String(v)),
  );
  if (clase) {
    try {
      return new (clase[1] as new (d: unknown) => object)({ llm: doble });
    } catch {
      // Constructor privado: se cae a la fabrica.
    }
  }

  const fabrica = Object.entries(mod).find(
    ([k, v]) => k.startsWith("get") && k.endsWith("Agent") && typeof v === "function",
  );
  if (fabrica) {
    try {
      return (fabrica[1] as () => object)();
    } catch {
      return null;
    }
  }
  return null;
}

describe("qué piden de verdad los 1.605 agentes sectoriales", () => {
  it("el inventario sale del árbol y no está vacío", () => {
    const f = ficherosDeAgentes(SECTORES);
    expect(f.length).toBeGreaterThan(1_000);
  });

  it(
    "se mide qué instrucción produce cada uno, y se agrupa por equivalencia REAL",
    async () => {
      const ficheros = ficherosDeAgentes(SECTORES);
      const doble = new ModeloQueSoloEscucha();

      // LA RED DE SEGURIDAD, y es una TRAMPA, no un doble amable.
      //
      // Cada agente recibe el doble por constructor, y con eso basta para
      // medir. Pero un agente que ignorase `deps.llm` y cogiera el singleton
      // hablaría con un proveedor de verdad. Confiar en que no haya claves
      // configuradas es exactamente el tipo de seguridad accidental que aquí no
      // vale: el día que alguien ponga una clave en su máquina, esta prueba
      // empieza a gastar dinero sin decirlo.
      //
      // Así que el singleton no devuelve un doble silencioso: devuelve algo que
      // REVIENTA. Un agente que lo use se cuenta como `no_ejecutable` con un
      // motivo que se lee en el informe, en vez de colarse por la puerta cara.
      const { LlmClient } = await import("../LlmClient");
      const trampa = {
        async complete(): Promise<string> {
          throw new Error("ha esquivado el doble y ha ido a por el cliente real");
        },
      };
      const original = LlmClient.getInstance;
      const instanciaOriginal = (LlmClient as unknown as { instance?: unknown }).instance;
      (LlmClient as unknown as { instance?: unknown }).instance = trampa;
      (LlmClient as unknown as { getInstance: () => unknown }).getInstance = () => trampa;

      const mediciones: Medicion[] = [];
      try {
        for (const f of ficheros) mediciones.push(await medir(f, doble));
      } finally {
        (LlmClient as unknown as { getInstance: unknown }).getInstance = original;
        (LlmClient as unknown as { instance?: unknown }).instance = instanciaOriginal;
      }

      const medidos = mediciones.filter((m) => m.estado === "medido");
      const noEjecutables = mediciones.filter((m) => m.estado === "no_ejecutable");

      const grupos = new Map<string, string[]>();
      for (const m of medidos) {
        const g = grupos.get(m.huellaInstruccion!) ?? [];
        g.push(m.agente);
        grupos.set(m.huellaInstruccion!, g);
      }

      const duplicados = [...grupos.entries()]
        .filter(([, xs]) => xs.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

      const informe = {
        _lee_esto: [
          "Equivalencia de los agentes sectoriales medida por SALIDA, no por fuente.",
          "",
          "Cada agente se ejecuto con el MISMO input y un modelo que no responde:",
          "solo se queda con la instruccion que recibe. Dos agentes con la misma",
          "huella piden literalmente lo mismo y son redundantes de verdad.",
          "",
          "`no_ejecutable` NO es equivalencia: es una medicion que no se pudo",
          "hacer, y no se mezcla con las que si.",
          "",
          "Esto MIDE. No migra nada. Fusionar antes de probar la equivalencia es",
          "como se pierden matices de mil en mil.",
        ],
        generado: new Date().toISOString(),
        total: mediciones.length,
        medidos: medidos.length,
        noEjecutables: noEjecutables.length,
        instruccionesDistintas: grupos.size,
        gruposRedundantes: duplicados.length,
        agentesEnGruposRedundantes: duplicados.reduce((n, [, xs]) => n + xs.length, 0),
        mayoresGrupos: duplicados.slice(0, 20).map(([h, xs]) => ({ huella: h, cuantos: xs.length, agentes: xs.slice(0, 12) })),
        porQueNoSePudoMedir: Object.entries(
          noEjecutables.reduce<Record<string, number>>((acc, m) => {
            // El motivo COMPLETO, no hasta el primer dos puntos. Agrupar por
            // «falla sin llegar a pedir» junta 447 causas distintas bajo una
            // etiqueta que no dice nada y no se puede arreglar.
            const k = (m.motivo ?? "?").replace(/[0-9a-f]{8,}/gi, "<id>").slice(0, 120);
            acc[k] = (acc[k] ?? 0) + 1;
            return acc;
          }, {}),
        ).sort((a, b) => b[1] - a[1]).slice(0, 25),
      };

      fs.writeFileSync(
        path.join(RAIZ, "backend", "os-agents", "equivalencia_por_salida.json"),
        `${JSON.stringify(informe, null, 2)}\n`,
        "utf8",
      );

      // ── Lo que se afirma ────────────────────────────────────────────────
      //
      // No se exige un número de duplicados: eso sería fijar el resultado antes
      // de medirlo. Se exige que la MEDICIÓN sea válida — que haya corrido de
      // verdad sobre una parte grande, y que el doble haya interceptado todo.
      expect(
        medidos.length,
        "se ha medido menos del 90 %: una equivalencia sacada de ahí no representa al conjunto",
      ).toBeGreaterThan(ficheros.length * 0.9);

      expect(grupos.size, "cero instrucciones distintas: el doble no capturó nada").toBeGreaterThan(0);

      // EL HALLAZGO, fijado para que no se pierda.
      //
      // 1.521 agentes medidos producen 1.521 instrucciones distintas. Ni una
      // sola pareja pide lo mismo. Es decir: la sospecha razonable de que aquí
      // hay «un agente copiado 1.605 veces» es FALSA, y ahora está medida en
      // vez de opinada.
      //
      // La consecuencia práctica: NO hay nada que consolidar. La directiva pedía
      // migrar sólo donde la equivalencia estuviera probada, y lo que se ha
      // probado es lo contrario.
      //
      // Si algún día esto se pone rojo, alguien ha fusionado dos agentes en uno.
      // Puede estar bien hecho — pero que lo mire una persona antes de dar por
      // buena la pérdida de un matiz sectorial.
      expect(
        duplicados.length,
        `hay ${duplicados.length} grupo(s) de agentes que piden EXACTAMENTE lo mismo. ` +
        `Hasta ahora no había ninguno. Mira equivalencia_por_salida.json: o se ha ` +
        `fusionado algo, o un agente ha dejado de personalizar su instrucción.`,
      ).toBe(0);
    },
    600_000,
  );
});
