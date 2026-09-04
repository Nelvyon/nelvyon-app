/**
 * A qué workspace pertenece un cliente.
 *
 * ── POR QUÉ EN UN SITIO ─────────────────────────────────────────────────────
 *
 * Las tablas del OS se reparten entre dos espacios de identidad que no encajan
 * solos: `os_jobs.client_id` es TEXT, `os_acciones.workspace_id` es INTEGER, y
 * el puente entre los dos es `os_clients`. Cada vez que un módulo necesita
 * cruzarlos vuelve a escribir la misma consulta.
 *
 * Se escribió tres veces en una tarde —registro de resultados, carga del
 * cerebro, sugerencias de venta cruzada—. Tres copias es exactamente donde
 * empieza la deriva: la cuarta olvida validar el uuid, o la segunda cambia y la
 * primera no.
 *
 * ── POR QUÉ VALIDA EL UUID ANTES ────────────────────────────────────────────
 *
 * `client_id` es TEXT y puede traer cualquier cosa. Comparar un texto
 * cualquiera contra `uuid` revienta la consulta, y ninguno de los tres
 * llamantes puede permitirse que un fallo aquí tumbe lo que estaba haciendo.
 *
 * ── DEVUELVE `null`, NO LANZA ───────────────────────────────────────────────
 *
 * «No consta» es una respuesta legítima y frecuente: hay clientes que existen
 * en otras tablas y no en `os_clients`. Quien llama decide qué hacer con eso, y
 * los tres deciden distinto.
 */
import { DbClient } from "../db/DbClient";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Conexión con lo justo: la forma, no la clase. */
export type ConexionDeClientes = {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
};

export async function workspaceDelCliente(
  clientId: string,
  db?: ConexionDeClientes,
): Promise<number | null> {
  if (!UUID.test(clientId)) return null;
  const conexion = db ?? DbClient.getInstance();
  const filas = await conexion.query<{ workspace_id: number | string }>(
    `SELECT workspace_id FROM os_clients WHERE id = $1::uuid LIMIT 1`,
    [clientId],
  );
  const w = filas[0]?.workspace_id;
  const n = typeof w === "number" ? w : typeof w === "string" ? Number(w) : NaN;
  return Number.isInteger(n) ? n : null;
}

/**
 * Los nombres de los DEMAS clientes del mismo workspace.
 *
 * ── PARA QUE ────────────────────────────────────────────────────────────────
 *
 * `MotorDeCalidad` tiene una comprobacion bloqueante —`sin-mezcla-de-clientes`—
 * que busca el nombre de otro cliente dentro de una pieza. Su cabecera lo llama
 * «el fallo que destruye la confianza», y con razon: recibir un plan donde
 * aparece el nombre de otro cliente de la misma agencia no se arregla pidiendo
 * perdon.
 *
 * La comprobacion estaba escrita y NUNCA se aplicaba: espera
 * `contexto.otrosClientes` y nadie se lo pasaba. Una comprobacion bloqueante
 * que no se ejecuta no protege de nada, y encima da la sensacion contraria.
 *
 * ── POR QUE SOLO DEL MISMO WORKSPACE ────────────────────────────────────────
 *
 * Sacar nombres de clientes de OTRAS agencias para compararlos aqui seria
 * filtrar entre inquilinos justo en el modulo que existe para evitar filtrar
 * entre clientes. La contaminacion que importa es la de al lado.
 */
export async function otrosClientesDelWorkspace(
  workspaceId: number,
  clientId: string,
  db?: ConexionDeClientes,
): Promise<string[]> {
  const conexion = db ?? DbClient.getInstance();
  const filas = await conexion.query<{ business_name: string }>(
    `SELECT business_name FROM os_clients
      WHERE workspace_id = $1 AND id <> $2::uuid AND business_name IS NOT NULL
      LIMIT 200`,
    [workspaceId, clientId],
  );
  return filas
    .map((f) => (f.business_name ?? "").trim())
    // Nombres muy cortos producirian falsos positivos absurdos: un cliente que
    // se llame «Sol» marcaria cualquier pieza que hable de energia solar.
    .filter((n) => n.length > 3);
}
