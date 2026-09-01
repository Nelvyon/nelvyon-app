/**
 * SOLO LECTURA. Responde una sola pregunta contra produccion:
 *
 *   la ruta Python de webhooks salientes —la que usan booking, campaign, crm,
 *   invoice y public_api— guarda sus entregas en `webhook_deliveries.webhook_id`,
 *   que la migracion 405 ata por clave foranea a `webhooks`. Pero sus endpoints
 *   viven en `webhook_endpoints`. Si esa FK esta en produccion, ningun envio se
 *   registra, y sin registro no hay reintento.
 *
 * No escribe nada. No imprime el DSN. COSTE EXTERNO: 0 EUR.
 */
import pg from "pg";
const CANDIDATOS = ["DATABASE_PUBLIC_URL", "POSTGRES_PUBLIC_URL", "DATABASE_URL", "POSTGRES_URL"];
const dsn = process.env[CANDIDATOS.find((n) => (process.env[n] ?? "").trim().length > 0) ?? ""];

// En lineas separadas, y no por estilo. El guardia
// `nada-de-secretos-en-los-diagnosticos` mira LINEA A LINEA: una linea que
// imprime y que ademas nombra un identificador sensible se marca, aunque lo que
// imprima sea una cadena fija. Es lo correcto para un detector de esta clase —
// distinguirlo de verdad exigiria seguir el flujo del valor— y el precio de
// escribirlo asi es cero. Los demas scripts de produccion ya lo hacen.
if (!dsn) {
  console.error(JSON.stringify({ ok: false, error: "sin cadena de conexion de produccion" }));
  process.exit(2);
}
const u = new URL(dsn);
const cli = new pg.Client({ connectionString: dsn, ssl: { rejectUnauthorized: false }, statement_timeout: 30_000 });
const out = { ok: true, destino: `${u.hostname}:${u.port}${u.pathname}` };
try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  out.fk = (await cli.query(
    `SELECT conname, confrelid::regclass::text AS apunta_a
       FROM pg_constraint WHERE conrelid='webhook_deliveries'::regclass AND contype='f'`)).rows;
  out.columnas = (await cli.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='webhook_deliveries' ORDER BY ordinal_position`)).rows.map(r => r.column_name);
  for (const t of ["webhooks", "webhook_endpoints", "webhook_deliveries"]) {
    out[`filas_${t}`] = Number((await cli.query(`SELECT count(*)::int c FROM ${t}`)).rows[0].c);
  }
  // Entregas cuyo webhook_id NO esta en webhooks: imposibles si la FK esta viva.
  out.entregas_de_endpoint = Number((await cli.query(
    `SELECT count(*)::int c FROM webhook_deliveries d
      WHERE EXISTS (SELECT 1 FROM webhook_endpoints e WHERE e.id = d.webhook_id)`)).rows[0].c);
  await cli.query("ROLLBACK");
} catch (e) { out.ok = false; out.error = e instanceof Error ? e.message : String(e); }
finally { await cli.end().catch(() => {}); }
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
