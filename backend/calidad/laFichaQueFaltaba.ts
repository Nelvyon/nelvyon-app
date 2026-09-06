/**
 * Las ocho comprobaciones que esperaban una ficha, y por qué seguían esperando.
 *
 * ── EL DIAGNÓSTICO, QUE NO ERA EL QUE PARECÍA ───────────────────────────────
 *
 * Estas ocho estaban etiquetadas como bloqueadas por
 * `PROVIDER_REAL_OUTPUT_VERIFICATION`: «hace falta un modelo real que emita la
 * ficha». Al ir a comprobarlo con el modelo local resultó que el modelo SÍ la
 * emite —se midió, tarda 19 s y cuesta 0—. Lo que no existía era la cadena:
 *
 *   1. NADIE se la pedía. Los 28 ficheros de prompts piden JSON riquísimo
 *      —`designConcept`, `colorPalette`, `homepageStructure`— y ni una sola vez
 *      un campo que alguna comprobación lea. Es el fallo que este mismo contrato
 *      advertía: «un campo que se llama `pages` en un agente y `paginas` en la
 *      comprobación».
 *
 *   2. NADIE la sacaba. Lo que devuelve cada paso viaja como TEXTO dentro de
 *      `steps[].data.output`. Aunque el modelo hubiera emitido `ctasPrincipales`,
 *      la comprobación lee `pieza.contenido.ctasPrincipales` y ahí no había nada:
 *      estaba dentro de una cadena.
 *
 * O sea, no era una deuda externa. Era la de siempre: capacidad construida y sin
 * conectar. Lo externo era la excusa.
 *
 * ── POR QUÉ AQUÍ Y NO EN LOS AGENTES ────────────────────────────────────────
 *
 * Se pide una vez, en el único punto por el que pasa todo trabajo terminado, y
 * se pide DERIVADO: qué campos necesita cada disciplina sale de preguntarle al
 * motor qué comprobaciones tiene, no de una lista escrita a mano. Un agente
 * nuevo, o una comprobación nueva, entra sola.
 *
 * Meterlo en los prompts de los 28 agentes habría sido 28 sitios donde el
 * nombre de un campo puede escribirse mal, que es exactamente cómo empezó esto.
 *
 * ── NO CUESTA, Y ESO ESTÁ FORZADO ───────────────────────────────────────────
 *
 * Es UNA llamada más por trabajo, y solo se hace si la política de coste dice
 * que el proveedor que la atendería es gratis. Con el modelo local —el camino
 * por defecto de los agentes, ADR-034— la respuesta es sí. Con OpenAI encendido
 * a propósito, la política dice que no y esto no se ejecuta: preferimos ocho
 * «no se pudo comprobar» honestos a una factura que nadie pidió.
 *
 * ── FALLA HACIA «NO SE PUDO COMPROBAR» ──────────────────────────────────────
 *
 * Si el modelo no responde, tarda, o devuelve basura, se devuelve ficha vacía.
 * Nunca se inventa un campo, y nunca se tumba una entrega por esto: el trabajo
 * ya está hecho, y una ayuda de calidad que rompe la entrega no es una ayuda.
 */
import { comprobacionesDe } from "./MotorDeCalidad";
import {
  FORMA_DE_CADA_CAMPO,
  QUE_ES_CADA_CAMPO,
  QUIEN_LEE_CADA_CAMPO,
  fichaDe,
  type FichaDeLaPieza,
} from "./contratoDeSalidaEstructurada";
import { parseJsonFromLlm } from "../autonomous/llm/parseJson";
import { apuntar, decidirCoste } from "../coste/PoliticaDeCosteCero";

/** Un salto de línea, con nombre para que no se pierda en un escape. */
const SALTO = String.fromCharCode(10);

/** Lo mínimo que hace falta de un modelo: una respuesta a un texto. */
export interface ModeloQueResponde {
  complete(prompt: string): Promise<string>;
}

/**
 * Cuánto del entregable se le enseña al modelo.
 *
 * Un entregable entero puede ser muy largo y aquí solo se busca de dónde sacar
 * ocho datos concretos. El tope evita que un trabajo grande convierta una ayuda
 * de calidad en el paso más caro del sistema.
 */
export const TOPE_DE_TEXTO = 6000;

/**
 * Cuanto se espera a la ficha antes de seguir sin ella.
 *
 * ── POR QUE HACE FALTA UN PLAZO PROPIO ──────────────────────────────────────
 *
 * El cliente de los agentes espera hasta 120 s a un modelo rapido y 300 s a uno
 * grande. Son plazos razonables para PRODUCIR un entregable, y disparatados
 * para esto: la ficha es una AYUDA de calidad sobre trabajo que YA esta hecho.
 * Con el plazo del cliente, un modelo inalcanzable —una IP que no responde en
 * vez de rechazar— dejaria cada trabajo terminado esperando dos minutos antes
 * de poder entregarse.
 *
 * Veinte segundos sobran: se midio el camino real y el modelo local contesta en
 * unos diez. Si no llega, las ocho comprobaciones dicen «no se pudo comprobar»,
 * que es la verdad, y la entrega sigue.
 */
export const PLAZO_DE_LA_FICHA_MS = 20_000;

/**
 * Qué campos de la ficha necesita esta disciplina.
 *
 * DERIVADO del motor: se miran sus comprobaciones y se devuelven los campos que
 * alguna de ellas lee. Si mañana `web` gana una comprobación que lee
 * `contrasteTextoFondo`, se le empieza a pedir sin tocar este fichero.
 */
export function camposQuePide(dominio: string): Array<keyof FichaDeLaPieza> {
  const ids = new Set(comprobacionesDe(dominio).map((c) => c.id));
  return (Object.keys(QUIEN_LEE_CADA_CAMPO) as Array<keyof FichaDeLaPieza>).filter((campo) =>
    ids.has(QUIEN_LEE_CADA_CAMPO[campo]),
  );
}

/**
 * Lo que se le pide al modelo, con los campos de esta disciplina y ninguno más.
 *
 * `null` cuando la disciplina no lee ninguno: pedir una ficha que nadie va a
 * mirar sería gastar una llamada para nada.
 */
export function instruccionDeFicha(dominio: string): string | null {
  const campos = camposQuePide(dominio);
  if (campos.length === 0) return null;
  // La FORMA va delante y la explicacion detras. Se midio con el modelo real:
  // solo con la explicacion, las listas de objetos no las emite —no sabe que
  // objeto lleva dentro— y prefiere omitir el campo, que es justo lo que se le
  // ha pedido. Con el esqueleto delante lo emite.
  const lineas = campos
    .map((c) => `  "${c}": ${FORMA_DE_CADA_CAMPO[c]}   // ${QUE_ES_CADA_CAMPO[c]}`)
    .join(SALTO);
  return [
    "Lee el trabajo de arriba y devuelve SOLO un objeto JSON con estas claves:",
    "",
    lineas,
    "",
    "Si un dato no aparece en el trabajo, OMITE su clave. No inventes ninguno:",
    "una clave inventada hace que una comprobación de calidad juzgue algo que",
    "nadie escribió.",
  ].join("\n");
}

/** Todo el texto de un resultado, incluido el anidado, hasta el tope. */
export function textoDelResultado(resultado: unknown): string {
  const trozos: string[] = [];
  let largo = 0;
  const recorrer = (v: unknown, prof = 0): void => {
    if (prof > 6 || largo > TOPE_DE_TEXTO) return;
    if (typeof v === "string") {
      trozos.push(v);
      largo += v.length;
    } else if (Array.isArray(v)) for (const x of v) recorrer(x, prof + 1);
    else if (v && typeof v === "object") for (const x of Object.values(v)) recorrer(x, prof + 1);
  };
  recorrer(resultado);
  return trozos.join("\n").slice(0, TOPE_DE_TEXTO);
}

/** Qué proveedor atendería la llamada, para preguntarle a la política de coste. */
export type ProveedorDeFicha = "ollama" | "openai";

/**
 * ¿Se puede pedir la ficha sin que suba la factura?
 *
 * Se pregunta a la política, no se deduce. Y se deja apunte de la decisión se
 * permita o no: si algún día deja de pedirse, la respuesta a «por qué» está
 * escrita.
 */
export function sePuedePedirSinCoste(proveedor: ProveedorDeFicha): boolean {
  const op = { proveedor, operacion: "generar" as const };
  const veredicto = decidirCoste(op);
  apuntar(op, veredicto);
  return veredicto.permitido === true;
}

/**
 * Pide la ficha al modelo y devuelve SOLO los campos que llegaron con la forma
 * correcta. Ficha vacía es una respuesta válida y frecuente.
 */
export async function pedirLaFicha(
  dominio: string,
  resultado: unknown,
  modelo: ModeloQueResponde,
  proveedor: ProveedorDeFicha,
  /**
   * Cuanto se espera, en milisegundos.
   *
   * Es un parametro y no una constante fija porque hay dos preguntas
   * distintas. En produccion importa NO retrasar una entrega terminada: 20 s.
   * La bateria que comprueba que un modelo REAL emite la forma pregunta otra
   * cosa —si la emite— y con el resto de la suite compitiendo por la CPU el
   * mismo modelo que responde en diez segundos tarda mas. Compartir plazo
   * haria que esa bateria midiera la carga de la maquina en vez del modelo.
   */
  plazoMs: number = PLAZO_DE_LA_FICHA_MS,
): Promise<FichaDeLaPieza> {
  const instruccion = instruccionDeFicha(dominio);
  if (!instruccion) return {};
  if (!sePuedePedirSinCoste(proveedor)) return {};

  const texto = textoDelResultado(resultado);
  // Sin texto no hay nada que leer, y una llamada con el hueco vacío solo
  // produce campos inventados.
  if (texto.trim().length < 40) return {};

  try {
    // Carrera contra el plazo: lo que no llegue a tiempo no se espera.
    //
    // No se cancela la peticion al modelo —el cliente no expone como— pero si
    // se deja de esperarla. Quedarse colgado aqui retrasaria una entrega que ya
    // esta terminada, y eso es peor que entregar sin ficha.
    let avisar: (() => void) | undefined;
    const plazo = new Promise<null>((resolver) => {
      const reloj = setTimeout(() => resolver(null), plazoMs);
      avisar = () => clearTimeout(reloj);
    });
    const respuesta = await Promise.race([modelo.complete(`${texto}\n\n${instruccion}`), plazo]);
    avisar?.();
    if (respuesta === null) return {};
    return fichaDe(parseJsonFromLlm(respuesta));
  } catch {
    // El modelo no respondió. Las ocho dirán «no se pudo comprobar», que es la
    // verdad, y la entrega sigue su camino.
    return {};
  }
}
