/**
 * UNA SOLA FUENTE DE VERDAD PARA EL CONTEXTO DEL CLIENTE.
 *
 * NELVYON tiene tres almacenes de contexto a la vez, y eso no es un detalle de
 * limpieza: son tres respuestas posibles a la misma pregunta.
 *
 *   `os_clients`         23 campos de texto libre, por workspace + cliente.
 *                        Lo rellena alguien de NELVYON en el alta.
 *   `client_profiles`    12 campos, por usuario + NOMBRE DE MARCA.
 *                        Lo leen 253 agentes sectoriales con `enrichInput`.
 *   `os_client_brain`    28 dimensiones estructuradas, por workspace + cliente,
 *                        con procedencia, confianza y caducidad.
 *
 * QUÉ SE DECIDE AQUÍ, y por qué así:
 *
 *   La fuente canónica es EL CEREBRO. Es la única de las tres que sabe de dónde
 *   salió cada dato, cuánto se fía de él y cuándo deja de valer. Sin eso, un
 *   agente no puede distinguir lo que dijo el cliente de lo que dedujo otro
 *   agente, que es exactamente el problema que el cerebro existe para resolver.
 *
 *   Las otras dos NO se borran todavía. Se leen como respaldo, y cada lectura
 *   dice de dónde vino. Borrar una lectura antes de demostrar que nadie la
 *   necesita es cómo se rompen 253 agentes a la vez.
 *
 * EL DESAJUSTE QUE HAY QUE SALVAR. El cerebro va por `workspace + cliente`;
 * `client_profiles` va por `usuario + nombre de marca`. Un nombre de marca no
 * es un identificador: dos clientes de dos workspaces distintos pueden llamarse
 * igual. Por eso la resolución de abajo **se niega a adivinar** cuando hay más
 * de un candidato, en vez de coger el primero.
 */

import type { CerebroDeNegocioService } from "./CerebroDeNegocioService";

export type OrigenDelContexto = "cerebro" | "client_profiles" | "ninguno";

export interface ContextoResuelto {
  /** De dónde salió lo que se devuelve. Nunca se oculta. */
  origen: OrigenDelContexto;
  /** El brief en texto, en la misma forma que esperaban los 253 agentes. */
  brief: string | null;
  /** Los campos sueltos, con los mismos nombres de siempre. */
  campos: Record<string, unknown>;
}

export interface ClienteResuelto {
  workspaceId: number;
  clientId: string;
}

export type ResolucionDeCliente =
  | { encontrado: true; cliente: ClienteResuelto }
  /** Ninguno, o VARIOS. Los dos son motivos para no adivinar. */
  | { encontrado: false; motivo: "no_existe" | "ambiguo"; candidatos: number };

export interface AlmacenDeResolucion {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/**
 * De `(usuario, nombre de marca)` a `(workspace, cliente)`.
 *
 * Se niega a devolver nada si hay más de un candidato. Coger el primero
 * mezclaría el contexto de dos clientes que se llaman igual, y ese fallo no
 * daría error: daría un texto plausible sobre el negocio equivocado.
 */
export async function resolverCliente(
  db: AlmacenDeResolucion,
  userId: string,
  brandName: string,
): Promise<ResolucionDeCliente> {
  const marca = brandName?.trim();
  if (!marca || !userId?.trim()) {
    return { encontrado: false, motivo: "no_existe", candidatos: 0 };
  }

  const filas = await db.query<{ id: string; workspace_id: number }>(
    `SELECT id, workspace_id
       FROM os_clients
      WHERE created_by_user_id = $1
        AND lower(business_name) = lower($2)
      LIMIT 5`,
    [userId, marca],
  );

  if (filas.length === 0) return { encontrado: false, motivo: "no_existe", candidatos: 0 };
  if (filas.length > 1) {
    return { encontrado: false, motivo: "ambiguo", candidatos: filas.length };
  }
  return {
    encontrado: true,
    cliente: { workspaceId: filas[0].workspace_id, clientId: filas[0].id },
  };
}

/**
 * Traducción entre las dimensiones del cerebro y los nombres de campo que los
 * 253 agentes ya esperan.
 *
 * Los nombres viejos se conservan EXACTAMENTE. Renombrarlos ahorraría unas
 * líneas y rompería 253 ficheros; el objetivo no es que el código quede bonito,
 * es que haya una sola verdad detrás.
 */
const DIMENSION_A_CAMPO: ReadonlyArray<
  [dimension: string, campo: string, extraer: (v: Record<string, unknown>) => unknown]
> = [
  ["empresa", "clientProfile_brand_name", (v) => v.texto],
  ["brand_voice", "clientProfile_brand_voice", (v) => v.texto],
  ["icp", "clientProfile_target_audience", (v) => v.texto],
  ["sector", "clientProfile_industry", (v) => v.texto],
  ["propuesta_de_valor", "clientProfile_usp", (v) => v.texto],
  [
    "competidores",
    "clientProfile_competitors",
    (v) => {
      const lista = v.competidores;
      if (!Array.isArray(lista)) return undefined;
      return lista.map((c) => (c as { nombre?: string })?.nombre).filter(Boolean).join(", ");
    },
  ],
  ["marca", "clientProfile_colors", (v) => {
    const c = v.colores;
    return Array.isArray(c) ? c.join(", ") : undefined;
  }],
  ["keywords", "clientProfile_keywords", (v) => {
    const k = v.items;
    return Array.isArray(k) ? k.join(", ") : undefined;
  }],
  ["resultados", "clientProfile_past_results", (v) => v],
  ["preferencias", "clientProfile_preferences", (v) => v],
];

/** El brief en prosa, que es lo que un prompt consume. */
export function construirBrief(campos: Record<string, unknown>): string | null {
  const partes: string[] = [];
  const decir = (etiqueta: string, clave: string): void => {
    const v = campos[clave];
    if (typeof v === "string" && v.trim().length > 0) partes.push(`${etiqueta}: ${v.trim()}`);
  };
  decir("Marca", "clientProfile_brand_name");
  decir("Sector", "clientProfile_industry");
  decir("Público", "clientProfile_target_audience");
  decir("Voz", "clientProfile_brand_voice");
  decir("Propuesta de valor", "clientProfile_usp");
  decir("Competidores", "clientProfile_competitors");
  decir("Palabras clave", "clientProfile_keywords");
  if (partes.length === 0) return null;
  return `CONTEXTO DEL CLIENTE\n${partes.join("\n")}`;
}

/**
 * El contexto de un cliente, con el cerebro como fuente canónica y
 * `client_profiles` como respaldo mientras existan las dos.
 *
 * El respaldo NO se mezcla con lo canónico. Si el cerebro tiene algo de ese
 * cliente, se usa el cerebro y punto: mezclar dos fuentes produce un contexto
 * que no existe en ninguna de las dos, y ante una contradicción nadie sabría
 * cuál ganó.
 */
export async function contextoCanonico(
  db: AlmacenDeResolucion,
  cerebro: CerebroDeNegocioService,
  userId: string,
  brandName: string,
): Promise<ContextoResuelto> {
  const vacio: ContextoResuelto = { origen: "ninguno", brief: null, campos: {} };

  const resolucion = await resolverCliente(db, userId, brandName);

  if (resolucion.encontrado) {
    const leido = await cerebro.paraAgente(
      resolucion.cliente.workspaceId,
      resolucion.cliente.clientId,
    );
    const campos: Record<string, unknown> = {};
    for (const [dimension, campo, extraer] of DIMENSION_A_CAMPO) {
      const valor = leido.contexto[dimension];
      if (!valor || typeof valor !== "object") continue;
      const v = extraer(valor as Record<string, unknown>);
      if (v !== undefined && v !== null && v !== "") campos[campo] = v;
    }
    if (Object.keys(campos).length > 0) {
      return { origen: "cerebro", brief: construirBrief(campos), campos };
    }
    // El cliente existe pero su cerebro está vacío. Se cae al respaldo, que es
    // exactamente el caso de un cliente antiguo aún sin migrar.
  }

  // ── Respaldo: `client_profiles` ─────────────────────────────────────────
  //
  // Sigue existiendo porque 253 agentes lo leen hoy. Cuando el cerebro cubra a
  // todos los clientes, esta rama deja de ejecutarse sola y sólo entonces se
  // podrá retirar — no antes.
  const perfiles = await db.query<{
    brand_name: string; brand_voice: string | null; target_audience: string | null;
    industry: string | null; competitors: string | null; usp: string | null;
    colors: string | null; keywords: string | null;
    past_results: unknown; preferences: unknown;
  }>(
    `SELECT brand_name, brand_voice, target_audience, industry, competitors,
            usp, colors, keywords, past_results, preferences
       FROM client_profiles
      WHERE user_id = $1::uuid AND brand_name = $2
      LIMIT 1`,
    [userId, brandName.trim()],
  ).catch(() => []);

  if (perfiles.length === 0) return vacio;
  const p = perfiles[0];
  const campos: Record<string, unknown> = {};
  const poner = (k: string, v: unknown): void => {
    if (v !== undefined && v !== null && v !== "") campos[k] = v;
  };
  poner("clientProfile_brand_name", p.brand_name);
  poner("clientProfile_brand_voice", p.brand_voice);
  poner("clientProfile_target_audience", p.target_audience);
  poner("clientProfile_industry", p.industry);
  poner("clientProfile_competitors", p.competitors);
  poner("clientProfile_usp", p.usp);
  poner("clientProfile_colors", p.colors);
  poner("clientProfile_keywords", p.keywords);
  poner("clientProfile_past_results", p.past_results);
  poner("clientProfile_preferences", p.preferences);

  return { origen: "client_profiles", brief: construirBrief(campos), campos };
}
