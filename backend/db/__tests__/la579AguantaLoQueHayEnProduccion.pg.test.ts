/**
 * LA 579 SE APLICA SOBRE LO QUE HAY EN PRODUCCIÓN, NO SOBRE UNA TABLA VACÍA.
 *
 * QUÉ PASÓ. La migración 579 añade un `CHECK` a `os_jobs.status`. Se certificó
 * aplicándola desde cero sobre una base recién creada —donde la tabla está
 * vacía y cualquier `CHECK` pasa— y falló en producción, donde había doce
 * trabajos en `cancelled`.
 *
 * Una migración que sólo se prueba contra una tabla vacía no está probada: se
 * ha comprobado que el SQL es sintácticamente correcto, que es la parte que no
 * falla nunca.
 *
 * QUÉ HACEN ESTAS PRUEBAS. Reproducen el estado real —filas con cada uno de los
 * estados que el sistema usa, incluidos los doce `cancelled`— y aplican el
 * `CHECK` encima. En las dos direcciones:
 *
 *   · con datos legítimos, entra;
 *   · con un estado inventado, NO entra.
 *
 * La segunda es la que impide el atajo. Si el `CHECK` se relajara hasta admitir
 * cualquier cosa —quitándolo, o poniendo un `IN` con todo— la primera prueba
 * seguiría verde. La segunda no.
 *
 * COSTE EXTERNO: 0 €. Base local; se salta sin ella.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? process.env.DATABASE_URL ?? "";
const conBase = DSN ? describe : describe.skip;

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const ESQUEMA = "prueba_579";

/** El `CHECK` tal cual lo escribe la migración: se lee, no se copia. */
function checkDeLa579(): string {
  const f = path.join(RAIZ, "backend", "db", "migrations", "579_la_cola_que_nadie_vaciaba.sql");
  const sql = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const limpio = sql
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
  const m = /CHECK\s*\(\s*status\s+IN\s*\(([\s\S]*?)\)\s*\)/i.exec(limpio);
  if (!m) throw new Error("no se encuentra el CHECK de la 579");
  const estados = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => `'${x[1]}'`);
  return `CHECK (status IN (${estados.join(", ")}))`;
}

let pool: pg.Pool;

conBase("la 579 aguanta lo que hay en producción", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 2 });
    await pool.query(`DROP SCHEMA IF EXISTS ${ESQUEMA} CASCADE`);
    await pool.query(`CREATE SCHEMA ${ESQUEMA}`);
  });

  afterAll(async () => {
    await pool.query(`DROP SCHEMA IF EXISTS ${ESQUEMA} CASCADE`).catch(() => undefined);
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(`DROP TABLE IF EXISTS ${ESQUEMA}.os_jobs`).catch(() => undefined);
  });

  /** Una tabla como la de producción, con las filas que se le digan. */
  async function conFilas(estados: string[]): Promise<void> {
    await pool.query(`
      CREATE TABLE ${ESQUEMA}.os_jobs (
        job_id text PRIMARY KEY,
        status text NOT NULL
      )`);
    for (const [i, e] of estados.entries()) {
      await pool.query(`INSERT INTO ${ESQUEMA}.os_jobs (job_id, status) VALUES ($1, $2)`, [`j${i}`, e]);
    }
  }

  const aplicarCheck = () =>
    pool.query(`ALTER TABLE ${ESQUEMA}.os_jobs ADD CONSTRAINT os_jobs_status_ck ${checkDeLa579()} NOT VALID`)
      .then(() => pool.query(`ALTER TABLE ${ESQUEMA}.os_jobs VALIDATE CONSTRAINT os_jobs_status_ck`));

  it("LA REGLA: con los 12 `cancelled` de producción, la 579 entra", async () => {
    // Exactamente lo que falló: doce filas canceladas y el resto del sistema.
    await conFilas([
      ...Array.from({ length: 12 }, () => "cancelled"),
      "queued",
      "running",
      "waiting_approval",
      "completed",
      "failed",
      "dead_letter",
    ]);
    await expect(aplicarCheck()).resolves.toBeDefined();
  });

  it("EL CONTROL: con un estado inventado, la 579 NO entra", async () => {
    // Sin esta prueba, la de arriba seguiría verde con un `CHECK` que aceptara
    // cualquier cosa — y entonces no estaría comprobando nada.
    await conFilas(["queued", "un_estado_que_nadie_ha_definido"]);
    await expect(aplicarCheck()).rejects.toThrow(/violated by some row|check constraint/i);
  });

  it("el `CHECK` rechaza una escritura posterior con un estado inválido", async () => {
    // No basta con que valide las filas de hoy: tiene que impedir las de
    // mañana. Es para lo que sirve un `CHECK` y conviene comprobarlo.
    await conFilas(["queued"]);
    await aplicarCheck();
    await expect(
      pool.query(`INSERT INTO ${ESQUEMA}.os_jobs (job_id, status) VALUES ('x', 'inventado')`),
    ).rejects.toThrow(/os_jobs_status_ck/);
  });

  it("y SÍ acepta una cancelación posterior", async () => {
    // El otro lado del control: cancelar un trabajo tiene que seguir siendo
    // posible después de aplicar la migración, o el arreglo no sirve de nada.
    await conFilas(["queued"]);
    await aplicarCheck();
    await expect(
      pool.query(`UPDATE ${ESQUEMA}.os_jobs SET status = 'cancelled' WHERE job_id = 'j0'`),
    ).resolves.toBeDefined();
  });
});
