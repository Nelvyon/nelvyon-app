/**
 * EL BANCO ANTI-GENÉRICO.
 *
 * LA PREGUNTA. Que 1.521 agentes produzcan 1.521 instrucciones distintas
 * demuestra que los agentes se diferencian ENTRE SÍ. No demuestra lo que de
 * verdad importa:
 *
 *     ¿UN MISMO AGENTE DICE COSAS DISTINTAS A CLIENTES DISTINTOS?
 *
 * Un agente puede tener una instrucción perfectamente única y aun así soltar el
 * mismo plan a un restaurante de barrio y a un SaaS que vende en toda Europa.
 * Eso no es marketing: es rellenar una plantilla con el nombre del cliente
 * puesto arriba.
 *
 * CÓMO SE MIDE, y por qué así. Se ejecuta el mismo agente con cinco clientes
 * que no se parecen en nada, con un modelo que no responde: SE QUEDA CON LA
 * INSTRUCCIÓN. Y sobre esas instrucciones se miden dos cosas distintas que
 * suelen confundirse:
 *
 *   COBERTURA      ¿llegan a la instrucción los hechos que distinguen a este
 *                  cliente? Si el presupuesto, el sector y la restricción legal
 *                  no aparecen, el agente no puede estar teniéndolos en cuenta:
 *                  no los ha visto.
 *
 *   SEPARACIÓN     quitando la plantilla —lo que es idéntico para los cinco—,
 *                  ¿queda algo propio de cada uno? Un agente puede citar el
 *                  nombre del cliente cincuenta veces y seguir diciendo lo
 *                  mismo. Lo que se mide es cuánto del texto NO es común.
 *
 * Las dos hacen falta. Con cobertura alta y separación cero, el agente recibe
 * los datos y no los usa. Con separación alta y cobertura baja, cambia de
 * palabras sin cambiar de criterio.
 *
 * COSTE EXTERNO: 0 €. El modelo nunca se llama.
 */

import { CLIENTES, cargaDe, type ClienteSintetico } from "./clientesSinteticos";

/** Lo que se le pide a un agente para poder medirlo. */
export interface AgenteMedible {
  serviceId: string;
  steps: ReadonlyArray<{
    name: string;
    run(payload: Record<string, unknown>, ctx: unknown): Promise<string>;
  }>;
}

/**
 * El modelo que sólo escucha.
 *
 * Devuelve siempre lo mismo a propósito: si la respuesta variase, dos
 * instrucciones idénticas podrían parecer distintas por culpa del doble, y la
 * medición diría personalización donde sólo hay ruido.
 */
export class ModeloQueSoloEscucha {
  readonly recibido: string[] = [];

  async complete(prompt: string): Promise<string> {
    this.recibido.push(prompt);
    return "respuesta fija del doble";
  }
}

export interface MedicionDeCliente {
  cliente: string;
  instruccion: string;
  /** Cuáles de sus hechos distintivos aparecen. */
  hechosPresentes: string[];
  hechosAusentes: string[];
}

export interface Veredicto {
  servicio: string;
  estado: "MEDIDO" | "NO_EJECUTABLE";
  motivo?: string;

  /** 0–1. Qué parte de los hechos distintivos llega a la instrucción. */
  cobertura: number;
  /**
   * 0–1. Qué parte del texto NO es común a los cinco.
   *
   * Cero significa que los cinco reciben literalmente lo mismo.
   */
  separacion: number;

  /** El detalle por cliente, para poder mirar por qué. */
  porCliente: MedicionDeCliente[];

  /** El juicio, con los umbrales explicados donde se calculan. */
  veredicto: "PERSONALIZA" | "PERSONALIZA_POCO" | "GENERICO" | "NO_MEDIDO";
}

/** Palabras que no distinguen nada y ensuciarían la medida de separación. */
const VACIAS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "y", "o", "que", "en", "para",
  "con", "por", "del", "al", "se", "su", "sus", "lo", "es", "son", "como",
  "más", "no", "sin", "sobre", "entre", "cada", "este", "esta", "estos",
  "the", "of", "and", "to", "a", "in", "for", "with", "on", "is", "are",
]);

function palabras(texto: string): Set<string> {
  return new Set(
    texto
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((p) => p.length > 3 && !VACIAS.has(p)),
  );
}

/**
 * Ejecuta un agente con los cinco clientes y mide.
 *
 * Se corre SÓLO EL PRIMER PASO que llama al modelo. Los siguientes reciben
 * como entrada la salida del anterior, que aquí es una respuesta fija: medir
 * más pasos mediría el doble, no al agente.
 */
export async function medirAgente(
  crear: (llm: ModeloQueSoloEscucha) => AgenteMedible,
  clientes: readonly ClienteSintetico[] = CLIENTES,
): Promise<Veredicto> {
  const vacio: Veredicto = {
    servicio: "?",
    estado: "NO_EJECUTABLE",
    cobertura: 0,
    separacion: 0,
    porCliente: [],
    veredicto: "NO_MEDIDO",
  };

  const mediciones: MedicionDeCliente[] = [];
  let servicio = "?";

  for (const c of clientes) {
    const doble = new ModeloQueSoloEscucha();
    let agente: AgenteMedible;
    try {
      agente = crear(doble);
      servicio = agente.serviceId;
    } catch (e) {
      return { ...vacio, motivo: `no se pudo crear: ${(e as Error).message.slice(0, 120)}` };
    }

    const primero = agente.steps[0];
    if (!primero) return { ...vacio, servicio, motivo: "el agente no tiene pasos" };

    try {
      await primero.run(cargaDe(c), { stepResults: {}, clientId: c.id, jobId: "medicion" });
    } catch (e) {
      // Puede fallar DESPUÉS de pedir. Si pidió, la medición vale.
      if (doble.recibido.length === 0) {
        return {
          ...vacio,
          servicio,
          motivo: `falla sin llegar a pedir: ${(e as Error).message.slice(0, 120)}`,
        };
      }
    }

    if (doble.recibido.length === 0) {
      return { ...vacio, servicio, motivo: "no pidió nada al modelo" };
    }

    const instruccion = doble.recibido.join("\n");
    const enMinusculas = instruccion.toLowerCase();
    const presentes = c.hechosQueLoDistinguen.filter((h) =>
      enMinusculas.includes(h.toLowerCase()),
    );

    mediciones.push({
      cliente: c.id,
      instruccion,
      hechosPresentes: presentes,
      hechosAusentes: c.hechosQueLoDistinguen.filter((h) => !presentes.includes(h)),
    });
  }

  // ── Cobertura ────────────────────────────────────────────────────────────
  const totalHechos = mediciones.reduce((n, m) => n + m.hechosPresentes.length + m.hechosAusentes.length, 0);
  const hechosVistos = mediciones.reduce((n, m) => n + m.hechosPresentes.length, 0);
  const cobertura = totalHechos === 0 ? 0 : hechosVistos / totalHechos;

  // ── Separación ───────────────────────────────────────────────────────────
  //
  // Lo COMÚN a los cinco es la plantilla. Lo que sobra al quitarla es lo que el
  // agente dice de ESTE cliente y de ningún otro. Si al quitar la plantilla no
  // queda nada, los cinco reciben lo mismo.
  const conjuntos = mediciones.map((m) => palabras(m.instruccion));
  const comun = conjuntos.reduce(
    (acc, s) => new Set([...acc].filter((p) => s.has(p))),
    conjuntos[0] ?? new Set<string>(),
  );
  const propios = conjuntos.map((s) => [...s].filter((p) => !comun.has(p)).length);
  const tamanos = conjuntos.map((s) => s.size);
  const separacion =
    tamanos.reduce((a, b) => a + b, 0) === 0
      ? 0
      : propios.reduce((a, b) => a + b, 0) / tamanos.reduce((a, b) => a + b, 0);

  return {
    servicio,
    estado: "MEDIDO",
    cobertura,
    separacion,
    porCliente: mediciones,
    veredicto: juzgar(cobertura, separacion),
  };
}

/**
 * El juicio.
 *
 * LOS UMBRALES, y de dónde salen. No son redondos por gusto:
 *
 *   cobertura < 0,5   la mitad de lo que distingue a un cliente no llega a la
 *                     instrucción. El agente no puede tener en cuenta lo que no
 *                     ha visto, así que da igual lo bien escrito que esté.
 *
 *   separación < 0,05 quitando lo idéntico para los cinco queda menos de una
 *                     palabra de cada veinte. Eso es el nombre del cliente y
 *                     poco más: una plantilla con la cabecera cambiada.
 *
 *   separación < 0,15 hay diferencias, pero pocas. Personaliza el texto, no la
 *                     decisión.
 */
export function juzgar(cobertura: number, separacion: number): Veredicto["veredicto"] {
  if (separacion < 0.05) return "GENERICO";
  if (cobertura < 0.5 || separacion < 0.15) return "PERSONALIZA_POCO";
  return "PERSONALIZA";
}

/**
 * LA PRUEBA CONTRAFACTUAL.
 *
 * El mismo cliente, cambiando UNA sola variable. Devuelve qué parte de la
 * instrucción cambió.
 *
 * Se leen los dos extremos:
 *
 *   cambio ≈ 0   esa variable no se está usando. Da igual lo que el cliente
 *                conteste en el intake: el plan sale igual.
 *   cambio ≈ 1   cambiar una variable ha cambiado todo. Eso no es razonar
 *                sobre ella; es regenerar de cero, y significa que la salida
 *                no es estable ni comparable entre revisiones.
 */
export async function medirContrafactual(
  crear: (llm: ModeloQueSoloEscucha) => AgenteMedible,
  base: ClienteSintetico,
  cambiado: ClienteSintetico,
): Promise<{ estado: "MEDIDO" | "NO_MEDIDO"; cambio: number; motivo?: string }> {
  const instruccionDe = async (c: ClienteSintetico): Promise<string | null> => {
    const doble = new ModeloQueSoloEscucha();
    try {
      const agente = crear(doble);
      await agente.steps[0]?.run(cargaDe(c), { stepResults: {}, clientId: c.id, jobId: "cf" });
    } catch {
      /* si pidió antes de fallar, sirve */
    }
    return doble.recibido.length > 0 ? doble.recibido.join("\n") : null;
  };

  const a = await instruccionDe(base);
  const b = await instruccionDe(cambiado);
  if (!a || !b) return { estado: "NO_MEDIDO", cambio: 0, motivo: "el agente no pidió nada" };

  const pa = palabras(a);
  const pb = palabras(b);
  const distintas = [...pa].filter((p) => !pb.has(p)).length + [...pb].filter((p) => !pa.has(p)).length;
  const total = pa.size + pb.size;
  return { estado: "MEDIDO", cambio: total === 0 ? 0 : distintas / total };
}
