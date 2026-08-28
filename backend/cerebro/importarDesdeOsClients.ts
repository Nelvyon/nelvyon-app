/**
 * CONECTAR, NO DUPLICAR: de `os_clients` al cerebro.
 *
 * `os_clients` ya guarda 23 campos de contexto por cliente. El problema no es
 * que falten datos: es que son 23 columnas `text` sin estructura, sin
 * procedencia y sin caducidad, que ningún agente lee.
 *
 * Este módulo los lleva al cerebro sin perder nada y sin inventar nada. Las
 * dos reglas que gobiernan la conversión:
 *
 *   1. **No se inventa estructura.** Si `competition` dice «Zara, Mango y H&M»,
 *      se parte en tres. Si dice «los de siempre, sobre todo la tienda del
 *      centro», NO se parte: se guarda como un competidor cuyo nombre es esa
 *      frase. Trocear una frase por comas produce competidores llamados «sobre
 *      todo la tienda del centro», que es peor que no tener el dato.
 *
 *   2. **La procedencia dice la verdad.** Todo lo que sale de aquí es
 *      `cliente_intake`: lo escribió el cliente. Marcarlo como `medido` o como
 *      deducido sería mentir sobre de dónde salió.
 *
 * Lo que NO se puede convertir queda fuera y aparece como hueco. Un cerebro que
 * rellena lo que no sabe convierte «no lo sé» en «lo sé».
 */

import type { CerebroDeNegocioService } from "./CerebroDeNegocioService";

/** Una fila de `os_clients`, en la forma que la devuelve la base. */
export interface FilaOsClient {
  id: string;
  workspace_id: number;
  business_name: string | null;
  sector: string | null;
  country: string | null;
  city: string | null;
  ideal_customer: string | null;
  value_proposition: string | null;
  differentiator: string | null;
  services: string | null;
  objectives: string | null;
  brand_tone: string | null;
  visual_style: string | null;
  brand_colors: string | null;
  logo_url: string | null;
  competition: string | null;
  budget: string | null;
  language: string | null;
  market: string | null;
  website_url: string | null;
}

function limpio(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length === 0 ? null : t;
}

/**
 * ¿Esta frase es una LISTA o es una FRASE?
 *
 * Es la decisión que separa una conversión útil de una que ensucia el cerebro.
 * Se trata como lista sólo cuando hay separadores Y ninguno de los trozos
 * parece una oración: un trozo con verbo o de más de seis palabras casi nunca
 * es un elemento de lista, es parte de una explicación.
 */
export function pareceLista(texto: string): boolean {
  const trozos = texto
    .split(/[,;·•\n|]|\s+y\s+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (trozos.length < 2) return false;
  return trozos.every((t) => t.split(/\s+/).length <= 6);
}

/** Parte en lista sólo si de verdad lo parece; si no, devuelve la frase entera. */
export function aLista(texto: string): string[] {
  if (!pareceLista(texto)) return [texto];
  return texto
    .split(/[,;·•\n|]|\s+y\s+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export interface ResultadoDeImportacion {
  clientId: string;
  escritas: string[];
  /** Campos de `os_clients` que estaban vacíos: no se inventan. */
  vacios: string[];
}

/**
 * Lleva una fila de `os_clients` al cerebro.
 *
 * Idempotente: escribir dos veces el mismo valor sube la versión pero no
 * cambia el contenido, y el histórico deja constancia de las dos.
 */
export async function importarClienteAlCerebro(
  cerebro: CerebroDeNegocioService,
  fila: FilaOsClient,
  origen = "importacion:os_clients",
): Promise<ResultadoDeImportacion> {
  const escritas: string[] = [];
  const vacios: string[] = [];

  const escribir = async (
    dimension: string,
    valor: Record<string, unknown> | null,
    campoOrigen: string,
  ): Promise<void> => {
    if (valor === null) {
      vacios.push(campoOrigen);
      return;
    }
    await cerebro.escribir({
      workspaceId: fila.workspace_id,
      clientId: fila.id,
      dimension,
      valor,
      procedencia: "cliente_intake",
      origen,
    });
    escritas.push(dimension);
  };

  // ── Texto directo ────────────────────────────────────────────────────────
  const empresa = limpio(fila.business_name);
  await escribir("empresa", empresa ? { texto: empresa } : null, "business_name");

  const sector = limpio(fila.sector);
  await escribir("sector", sector ? { texto: sector } : null, "sector");

  const icp = limpio(fila.ideal_customer);
  await escribir("icp", icp ? { texto: icp } : null, "ideal_customer");

  // `value_proposition` y `differentiator` responden a la misma pregunta —por
  // qué te eligen a ti— y se guardaban por separado. Se unen conservando las
  // dos, en vez de elegir una y perder la otra.
  const vp = limpio(fila.value_proposition);
  const dif = limpio(fila.differentiator);
  const propuesta = [vp, dif].filter(Boolean).join(". ");
  await escribir(
    "propuesta_de_valor",
    propuesta.length > 0 ? { texto: propuesta } : null,
    "value_proposition+differentiator",
  );

  const tono = limpio(fila.brand_tone);
  await escribir("brand_voice", tono ? { texto: tono } : null, "brand_tone");

  // ── Listas, sólo si de verdad lo son ─────────────────────────────────────
  const servicios = limpio(fila.services);
  await escribir("servicios", servicios ? { items: aLista(servicios) } : null, "services");

  // ── Estructuras ──────────────────────────────────────────────────────────
  const competencia = limpio(fila.competition);
  await escribir(
    "competidores",
    competencia ? { competidores: aLista(competencia).map((nombre) => ({ nombre })) } : null,
    "competition",
  );

  // Los objetivos venían como texto. Se conservan como objetivos SIN métrica:
  // inventarle una métrica a «quiero vender más» es ponerle al cliente un
  // objetivo que no ha dicho.
  const objetivos = limpio(fila.objectives);
  await escribir(
    "objetivos",
    objetivos
      ? { objetivos: aLista(objetivos).map((metrica) => ({ metrica, valorObjetivo: null, plazo: null })) }
      : null,
    "objectives",
  );

  const ciudad = limpio(fila.city);
  const pais = limpio(fila.country);
  await escribir(
    "ubicaciones",
    ciudad || pais
      ? { ubicaciones: [{ nombre: empresa ?? "principal", ciudad: ciudad ?? "", pais: pais ?? "" }] }
      : null,
    "city+country",
  );

  // ── Mapas ────────────────────────────────────────────────────────────────
  const marca: Record<string, unknown> = {};
  if (limpio(fila.brand_colors)) marca.colores = aLista(limpio(fila.brand_colors)!);
  if (limpio(fila.logo_url)) marca.logo = limpio(fila.logo_url);
  if (limpio(fila.visual_style)) marca.estilo = limpio(fila.visual_style);
  await escribir("marca", Object.keys(marca).length > 0 ? marca : null, "brand_*");

  const activos: Record<string, unknown> = {};
  if (limpio(fila.website_url)) activos.web = limpio(fila.website_url);
  await escribir("activos", Object.keys(activos).length > 0 ? activos : null, "website_url");

  // ── Presupuesto ──────────────────────────────────────────────────────────
  //
  // `budget` es texto («unos 500 al mes», «1.500 €»). NO se convierte a
  // céntimos adivinando: un presupuesto mal leído es dinero mal gastado. Se
  // conserva la frase y se deja el importe a null, que es lo que obliga a
  // preguntarlo antes de gastar.
  const presupuesto = limpio(fila.budget);
  await escribir(
    "presupuestos",
    presupuesto ? { moneda: "EUR", mensualCents: null, declaradoPorElCliente: presupuesto } : null,
    "budget",
  );

  // `language` y `market` orientan cómo se habla y dónde: preferencias.
  const preferencias: Record<string, unknown> = {};
  if (limpio(fila.language)) preferencias.idioma = limpio(fila.language);
  if (limpio(fila.market)) preferencias.mercado = limpio(fila.market);
  await escribir(
    "preferencias",
    Object.keys(preferencias).length > 0 ? preferencias : null,
    "language+market",
  );

  return { clientId: fila.id, escritas, vacios };
}
