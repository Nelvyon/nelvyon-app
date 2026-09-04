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
