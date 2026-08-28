#!/usr/bin/env node
/**
 * ARRANCAR EL TRABAJADOR que vacía `os_jobs`.
 *
 * `os_jobs` acumulaba doce trabajos en `queued` desde el 29 de junio de 2026, y
 * ni un solo `completed` en toda la historia de la tabla, porque nadie la
 * consultaba nunca. Éste es el proceso que faltaba.
 *
 * TRES PUERTAS ANTES DE TOCAR NADA, en este orden:
 *
 *   1. La migración 579 tiene que estar aplicada. Sin sus columnas, el reclamo
 *      no es atómico y dos trabajadores se llevarían la misma fila.
 *   2. Apuntar a producción exige autorización EXPLÍCITA. Los doce trabajos
 *      pendientes son encargos reales de clientes reales; ejecutarlos «para
 *      probar» no es una prueba, es trabajo enviado a alguien.
 *   3. `--seco` recorre la cola sin ejecutar nada: dice qué haría.
 *
 * USO
 *   DATABASE_URL=<local> node scripts/trabajador-de-cola.mjs --seco
 *   DATABASE_URL=<local> node scripts/trabajador-de-cola.mjs
 *
 *   Contra producción, y sólo con la decisión tomada:
 *     NELVYON_TRABAJADOR_AUTORIZADO_EN_PRODUCCION=1 \
 *     NELVYON_TRABAJADOR_AUTORIZADO_POR="<nombre>" \
 *     DATABASE_URL=<produccion> node scripts/trabajador-de-cola.mjs
 *
 * SALIDA
 *   0  el trabajador arrancó (o el recorrido en seco terminó)
 *   1  falta algo para poder arrancar con garantías
 *   3  se intentó apuntar a producción sin autorización
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";
import pg from "pg";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECO = process.argv.includes("--seco");

function abortar(codigo, mensaje) {
  console.error(`\n${mensaje}\n`);
  process.exit(codigo);
}

const dsn = (process.env.DATABASE_URL ?? "").trim();
if (!dsn) abortar(1, "Falta DATABASE_URL.");

// ── Puerta 2 · producción ───────────────────────────────────────────────────
//
// Se detecta por lo que la cadena DICE, no por una variable de entorno que
// alguien pueda olvidar. Un anfitrión que no sea local se trata como
// producción: fallar cerrado ante la duda.
const anfitrion = (() => {
  try {
    return new URL(dsn.replace(/^postgres(ql)?:\/\//, "http://")).hostname;
  } catch {
    return "";
  }
})();
const esLocal = ["127.0.0.1", "localhost", "::1", "host.docker.internal"].includes(anfitrion);

if (!esLocal) {
  const autorizado = process.env.NELVYON_TRABAJADOR_AUTORIZADO_EN_PRODUCCION === "1";
  const quien = (process.env.NELVYON_TRABAJADOR_AUTORIZADO_POR ?? "").trim();
  if (!autorizado || !quien) {
    abortar(
      3,
      [
        `La cadena apunta a "${anfitrion}", que no es local.`,
        "",
        "Los doce trabajos que hay en cola son encargos reales de clientes",
        "reales, parados desde el 29 de junio. Ejecutarlos manda trabajo a",
        "personas: eso se decide, no se prueba.",
        "",
        "Si es lo que quieres:",
        "  NELVYON_TRABAJADOR_AUTORIZADO_EN_PRODUCCION=1 \\",
        '  NELVYON_TRABAJADOR_AUTORIZADO_POR="<tu nombre>" \\',
        "  node scripts/trabajador-de-cola.mjs",
      ].join("\n"),
    );
  }
  console.log(`Autorizado en produccion por: ${quien}`);
}

// ── Puerta 1 · la migración ─────────────────────────────────────────────────

const sonda = new pg.Client({
  connectionString: dsn,
  ssl: esLocal ? undefined : { rejectUnauthorized: false },
});
await sonda.connect();

const { rows: columnas } = await sonda.query(
  `SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'os_jobs'
      AND column_name = ANY($1::text[])`,
  [["attempts", "run_after", "locked_by", "lease_expires_at", "dead_lettered_at"]],
);
if (columnas.length < 5) {
  await sonda.end();
  abortar(
    1,
    "Falta la migracion 579 en este destino.\n" +
      "Sin sus columnas el reclamo no es atomico y dos trabajadores se\n" +
      "llevarian la misma fila. Aplicala antes.",
  );
}

const { rows: resumen } = await sonda.query(
  `SELECT status, count(*)::int n FROM os_jobs GROUP BY status ORDER BY n DESC`,
);
console.log("\nEstado de la cola:");
for (const r of resumen) console.log(`  ${String(r.status).padEnd(18)} ${r.n}`);
if (resumen.length === 0) console.log("  (vacia)");

// ── Puerta 3 · recorrido en seco ────────────────────────────────────────────

if (SECO) {
  const { rows: listos } = await sonda.query(
    `SELECT job_id, service_id, attempts, max_attempts, run_after
       FROM os_jobs
      WHERE status = 'queued' AND run_after <= NOW()
        AND dead_lettered_at IS NULL AND attempts < max_attempts
      ORDER BY run_after ASC, created_at ASC
      LIMIT 25`,
  );
  console.log(`\nEn seco: se reclamarian ${listos.length} trabajo(s) ahora mismo.`);
  for (const j of listos) {
    console.log(`  ${j.job_id}  servicio=${j.service_id}  intento ${j.attempts + 1}/${j.max_attempts}`);
  }
  console.log("\nNo se ha ejecutado nada.");
  await sonda.end();
  process.exit(0);
}

await sonda.end();

// ── Arranque ────────────────────────────────────────────────────────────────
//
// El trabajador vive en TypeScript, así que se carga con `tsx`. Se registra
// aquí y no en la cabecera para que las tres puertas de arriba se evalúen sin
// pagar el coste de compilar medio árbol.
register("tsx/esm", import.meta.url);

const { DbJobsClient } = await import(path.join(ROOT, "backend/db/DbJobsClient.ts"));
const { ColaDeTrabajos } = await import(path.join(ROOT, "backend/queue/colaDeTrabajos.ts"));
const { TrabajadorDeCola } = await import(path.join(ROOT, "backend/queue/trabajadorDeCola.ts"));
const { manejadorDeServicioOs } = await import(path.join(ROOT, "backend/queue/manejadorDeServicioOs.ts"));
const { OS_PREMIUM_SERVICE_IDS } = await import(path.join(ROOT, "backend/os-agents/constants.ts"));

const cola = new ColaDeTrabajos(DbJobsClient.getInstance());
const trabajador = new TrabajadorDeCola(cola, {
  concurrencia: Number(process.env.NELVYON_TRABAJADOR_CONCURRENCIA ?? 3),
});

// El catálogo de servicios sale de `constants.ts`: si mañana hay un servicio
// nuevo, se registra solo. Escribir la lista aquí a mano garantizaría que un
// dia falte uno y sus trabajos caigan a `dead_letter` sin motivo real.
for (const servicio of OS_PREMIUM_SERVICE_IDS) {
  trabajador.registrarManejador(servicio, manejadorDeServicioOs);
}

trabajador.arrancar();
console.log(`\nTrabajador en marcha · ${trabajador.manejadoresRegistrados().length} servicios registrados`);
console.log("Ctrl+C para parar; espera a que termine lo que tenga en vuelo.\n");

const parar = async () => {
  console.log("\nParando: no se toma trabajo nuevo, se espera a lo que hay en vuelo...");
  await trabajador.parar();
  process.exit(0);
};
process.on("SIGINT", parar);
process.on("SIGTERM", parar);
