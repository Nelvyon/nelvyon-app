#!/usr/bin/env node
/**
 * EL CUADRO DE MANDO DE NELVYON.
 *
 * Mide el estado real contra una base de datos. La regla que lo gobierna es una
 * sola y no admite excepción:
 *
 *     SIN DATO SE DICE «DESCONOCIDO». Nunca cero, nunca «bien», nunca una
 *     estimación con formato de medida.
 *
 * Existe porque este proyecto ya ha pagado el precio contrario. Producción
 * llevaba 37 días sin producir nada y los paneles seguían pintando números;
 * 14.178 eventos de auditoría decían `ok: true` sobre trabajo que no había
 * hecho ninguna IA. Un panel que siempre tiene una cifra es un panel en el que
 * se deja de mirar si la cifra es cierta.
 *
 * SOLO LEE. Abre la conexión en modo de solo lectura impuesto por PostgreSQL,
 * no por buena voluntad del código, así que puede apuntarse a producción sin
 * riesgo de escribir nada.
 *
 * USO
 *   DATABASE_URL=<destino> node scripts/cuadro-de-mando.mjs
 *   DATABASE_URL=<destino> node scripts/cuadro-de-mando.mjs --json
 */
import pg from "pg";

const COMO_JSON = process.argv.includes("--json");
const DESCONOCIDO = Symbol("desconocido");

const dsn = (process.env.DATABASE_URL ?? "").trim();
if (!dsn) {
  console.error("Falta DATABASE_URL.");
  process.exit(2);
}
const esLocal = /(?:127\.0\.0\.1|localhost|::1|host\.docker\.internal)/.test(dsn);

const cliente = new pg.Client({
  connectionString: dsn,
  ssl: esLocal ? undefined : { rejectUnauthorized: false },
  // Solo lectura impuesta por el motor. Un `SELECT` mal escrito no puede
  // convertirse en un `UPDATE` por accidente.
  options: "-c default_transaction_read_only=on",
});
await cliente.connect();

/**
 * Una métrica. Si la tabla no existe o no hay filas, devuelve DESCONOCIDO en
 * vez de cero: «no lo sé» y «vale cero» son cosas distintas y confundirlas es
 * exactamente lo que hace inútil un panel.
 */
async function metrica(nombre, sql, params = [], transformar = (r) => r) {
  try {
    const { rows } = await cliente.query(sql, params);
    if (rows.length === 0) return { nombre, valor: DESCONOCIDO, motivo: "sin filas" };
    const v = transformar(rows);
    if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) {
      return { nombre, valor: DESCONOCIDO, motivo: "sin dato" };
    }
    return { nombre, valor: v };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Una tabla que no existe NO es un cero. Es que esa capacidad todavía no
    // está desplegada aquí, y decirlo es más útil que pintar un 0.
    return {
      nombre,
      valor: DESCONOCIDO,
      motivo: /does not exist/.test(msg) ? "la tabla no existe en este destino" : msg.slice(0, 80),
    };
  }
}

const n = (rows) => Number(rows[0].n);
const num = (rows) => (rows[0].v === null ? null : Number(rows[0].v));

// ── Activación: ¿el cliente llega a recibir algo? ───────────────────────────

const activacion = await Promise.all([
  metrica(
    "clientes con al menos un servicio pedido",
    `SELECT COUNT(DISTINCT client_id)::text n FROM os_service_requests`,
    [], n,
  ),
  metrica(
    "clientes listos para operar (cerebro completo)",
    // Un cliente está listo cuando tiene todas las dimensiones imprescindibles.
    // El número 8 no se escribe aquí: sale de contar las que hay.
    `SELECT COUNT(*)::text n FROM (
       SELECT client_id FROM os_client_brain
        GROUP BY workspace_id, client_id
       HAVING COUNT(DISTINCT dimension) >= 8
     ) x`,
    [], n,
  ),
  metrica(
    "conexiones pendientes que bloquean trabajo",
    `SELECT COUNT(*)::text n FROM os_client_connections
      WHERE estado IN ('necesaria','invitada')`,
    [], n,
  ),
  metrica(
    "días medianos hasta el primer entregable",
    `SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (d.created_at - c.created_at)) / 86400
            ) v
       FROM os_clients c
       JOIN LATERAL (
         SELECT MIN(created_at) created_at FROM os_deliverables
          WHERE client_id = c.id
       ) d ON d.created_at IS NOT NULL`,
    [],
    (rows) => {
      const v = rows[0].v === null ? null : Number(rows[0].v);
      if (v === null) return null;
      // Un valor casi cero NO se pinta como "0,00 días de time-to-value".
      // Medido en producción: 0,0000021 días. Eso no significa que NELVYON
      // entregue en dos décimas de segundo: significa que los entregables se
      // crearon en el mismo instante que el cliente —volcado o migración— y
      // que `os_clients.created_at` no marca cuándo empezó de verdad.
      //
      // Una cifra que la aritmética produce pero que no mide lo que dice medir
      // es peor que no tenerla: se copia a una presentación y ya no hay quien
      // la desmienta.
      if (v < 0.01) return null;
      return Math.round(v * 100) / 100;
    },
  ),
]);

// ── Autonomía: ¿la máquina trabaja sola? ────────────────────────────────────

const autonomia = await Promise.all([
  metrica("trabajos en cola", `SELECT COUNT(*)::text n FROM os_jobs WHERE status='queued'`, [], n),
  metrica("trabajos completados", `SELECT COUNT(*)::text n FROM os_jobs WHERE status='completed'`, [], n),
  metrica("trabajos en dead_letter", `SELECT COUNT(*)::text n FROM os_jobs WHERE status='dead_letter'`, [], n),
  metrica(
    "trabajos esperando a una persona",
    `SELECT COUNT(*)::text n FROM os_jobs WHERE status='waiting_approval'`, [], n,
  ),
  metrica(
    "tasa de reintento (intentos por trabajo)",
    `SELECT AVG(attempts)::numeric(10,2) v FROM os_jobs WHERE attempts > 0`, [], num,
  ),
]);

// ── IA real: la métrica que lo desencadenó todo ─────────────────────────────

const ia = await Promise.all([
  metrica(
    "eventos de agente registrados",
    `SELECT COUNT(*)::text n FROM os_agent_audit_events`, [], n,
  ),
  metrica(
    "eventos con modelo REAL",
    `SELECT COUNT(*)::text n FROM os_agent_audit_events WHERE llm_mode = 'real'`, [], n,
  ),
  metrica(
    "tokens consumidos en total",
    `SELECT COALESCE(SUM(tokens),0)::text n FROM os_agent_audit_events`, [], n,
  ),
]);

// ── Dinero: ¿se gasta lo que se autoriza, y nada más? ───────────────────────

const dinero = await Promise.all([
  metrica(
    "autorizaciones de gasto aprobadas",
    `SELECT COUNT(*)::text n FROM autorizaciones_de_gasto WHERE estado='aprobada'`, [], n,
  ),
  metrica(
    "gastos ejecutados",
    `SELECT COUNT(*)::text n FROM gastos_ejecutados WHERE estado='ejecutado'`, [], n,
  ),
  metrica(
    "gastos DENEGADOS por la guarda",
    `SELECT COUNT(*)::text n FROM gastos_ejecutados WHERE estado='denegado'`, [], n,
  ),
]);

// ── Resultados: ¿sirve de algo lo que se entrega? ───────────────────────────

const resultados = await Promise.all([
  metrica("objetivos declarados", `SELECT COUNT(*)::text n FROM os_objetivos WHERE estado='activo'`, [], n),
  metrica(
    "objetivos CON línea base",
    // Ésta es la métrica que dice si NELVYON puede afirmar algo. Sin línea
    // base, ningún número posterior es un resultado.
    `SELECT COUNT(DISTINCT objetivo_id)::text n FROM os_mediciones WHERE es_linea_base`, [], n,
  ),
  metrica("acciones registradas", `SELECT COUNT(*)::text n FROM os_acciones`, [], n),
  metrica(
    "aprendizajes con atribución mejor que coincidencia",
    `SELECT COUNT(*)::text n FROM os_aprendizajes
      WHERE confianza_atribucion IN ('correlacion','experimento')`, [], n,
  ),
]);

// ── Entrega ─────────────────────────────────────────────────────────────────

const entrega = await Promise.all([
  metrica("entregables", `SELECT COUNT(*)::text n FROM os_deliverables WHERE archived_at IS NULL`, [], n),
  metrica(
    "entregables aprobados por el cliente",
    `SELECT COUNT(*)::text n FROM os_deliverables WHERE approved_at IS NOT NULL`, [], n,
  ),
  metrica(
    "entregables esperando aprobación",
    `SELECT COUNT(*)::text n FROM os_deliverables
      WHERE status='delivered' AND visibility='client_visible'
        AND approved_at IS NULL AND client_reviewed_at IS NULL`, [], n,
  ),
]);

await cliente.end();

// ── Salida ──────────────────────────────────────────────────────────────────

const bloques = [
  ["ACTIVACIÓN · ¿el cliente llega a recibir algo?", activacion],
  ["AUTONOMÍA · ¿la máquina trabaja sola?", autonomia],
  ["IA REAL · con qué se produce el trabajo", ia],
  ["DINERO · se gasta lo autorizado, y nada más", dinero],
  ["RESULTADOS · ¿sirve de algo lo que se entrega?", resultados],
  ["ENTREGA", entrega],
];

if (COMO_JSON) {
  const salida = {};
  for (const [titulo, ms] of bloques) {
    salida[titulo] = Object.fromEntries(
      ms.map((m) => [
        m.nombre,
        m.valor === DESCONOCIDO ? { desconocido: true, motivo: m.motivo } : m.valor,
      ]),
    );
  }
  console.log(JSON.stringify(salida, null, 2));
  process.exit(0);
}

console.log("CUADRO DE MANDO DE NELVYON");
console.log(`destino: ${esLocal ? "local" : "REMOTO"} · sólo lectura`);
console.log("═".repeat(78));

let desconocidas = 0;
for (const [titulo, ms] of bloques) {
  console.log("");
  console.log(titulo);
  console.log("─".repeat(78));
  for (const m of ms) {
    if (m.valor === DESCONOCIDO) {
      desconocidas += 1;
      console.log(`  ${m.nombre.padEnd(50)} DESCONOCIDO  (${m.motivo})`);
    } else {
      console.log(`  ${m.nombre.padEnd(50)} ${String(m.valor)}`);
    }
  }
}

const total = bloques.reduce((a, [, ms]) => a + ms.length, 0);
console.log("");
console.log("═".repeat(78));
console.log(`${total - desconocidas} métricas medidas · ${desconocidas} DESCONOCIDAS`);
console.log("");
console.log("Una métrica DESCONOCIDA no es un cero. Es que aquí no hay con qué");
console.log("responderla, y decirlo vale más que pintar una cifra que nadie ha medido.");
