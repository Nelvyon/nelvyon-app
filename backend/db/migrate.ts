import fs from "fs";
import path from "path";

import { DbClient } from "./DbClient";
import { loadEnvFiles } from "./loadEnvFiles";
import {
  evaluateProdMigrateGate,
  readProdMigrateApproval,
  resolveDeployEnvironment,
} from "./prodMigrateGate";
import {
  describirOmision,
  isTolerableConsolidatedMigrationError,
  splitSqlStatements,
  type SentenciaOmitida,
} from "./splitSqlStatements";

const CONSOLIDATED_MIGRATION = "507_fastapi_runtime_schemas.sql";

/**
 * ADR-064: even the low-level `migrate.ts` entrypoint must refuse production
 * applies without CEO-auditable approval (blocks `pnpm migrate` bypass of migrate:prod).
 */
async function assertProdMigrateGate(db: DbClient, files: string[]): Promise<void> {
  const pending: string[] = [];
  for (const file of files) {
    const rows = await db.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [
      file,
    ]);
    if (rows.length === 0) pending.push(file);
  }
  const deploy = resolveDeployEnvironment();
  const approval = readProdMigrateApproval();
  const decision = evaluateProdMigrateGate({
    isProduction: deploy.isProduction,
    approval,
    pendingCount: pending.length,
  });
  console.log(
    `[migrate] deploy_env=${deploy.label} isProduction=${deploy.isProduction} pending_count=${pending.length}`,
  );
  console.log(`[migrate] gate: ${decision.message}`);
  if (!decision.allowApply) {
    await db.end();
    process.exit(decision.exitCode);
  }
}

async function runMigrations(): Promise<void> {
  loadEnvFiles();
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      executed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  await assertProdMigrateGate(db, files);
  for (const file of files) {
    const rows = await db.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [file]);
    if (rows.length > 0) {
      console.log(`[migrate] skip: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`[migrate] run: ${file}`);
    if (file === CONSOLIDATED_MIGRATION) {
      await runConsolidatedMigration(db, file, sql);
    } else {
      await db.query(sql);
    }
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`[migrate] done: ${file}`);
  }
  console.log("[migrate] all migrations complete");
  await db.end();
}

/**
 * La migracion consolidada se aplica sentencia a sentencia porque un esquema
 * heredado puede tener ya parte de lo que declara. Lo que NO puede hacer es
 * saltarse una sentencia que debia crear algo y registrarse igual como
 * aplicada: eso fue lo que dejo produccion sin `campaign_recipients`,
 * `funnel_steps`, `workflow_nodes`, `visual_workflow_executions` ni
 * `workflow_trigger_registry`, con `_migrations` diciendo que la 507 estaba
 * puesta. Campanas, embudos y workflows visuales llevan rotos desde entonces.
 *
 * Ahora las omisiones se enumeran, y si alguna era una sentencia que debia
 * cumplirse, la migracion FALLA y no se registra. Un fallo ruidoso al migrar
 * cuesta una tarde; una tabla ausente en produccion no se descubre hasta que
 * un cliente la pisa.
 */
async function runConsolidatedMigration(db: DbClient, file: string, sql: string): Promise<void> {
  const statements = splitSqlStatements(sql);
  let ok = 0;
  const omitidas: SentenciaOmitida[] = [];
  const intolerables: SentenciaOmitida[] = [];

  for (const stmt of statements) {
    try {
      await db.query(stmt);
      ok += 1;
    } catch (err: unknown) {
      const detalle = describirOmision(err, stmt);
      if (isTolerableConsolidatedMigrationError(err, stmt)) {
        omitidas.push(detalle);
        console.warn(`[migrate] warn ${file} [${detalle.code}]: ${detalle.preview}`);
        continue;
      }
      intolerables.push(detalle);
      // No se corta al primero: enumerar TODO lo que falta convierte una
      // partida de arreglos de uno en uno en un solo diagnostico completo.
    }
  }

  console.log(
    `[migrate] ${file}: ${ok} sentencias ok, ${omitidas.length} omitidas por deriva idempotente`,
  );

  // La 507 arrastra una deuda real y medida: concatena el SQL de ~40 servicios
  // y no es coherente consigo misma. Esa deuda esta ESCRITA en
  // `omisiones_conocidas_507.json`, con la sentencia y el motivo de cada una.
  // Lo que ya fallaba el 28-08-2026 no bloquea; cualquier fallo nuevo si. La
  // diferencia con la lista de tolerancia antigua es que aquella era una
  // categoria abierta —"todo error 42P01"— y esta es una lista cerrada de
  // sentencias concretas que no puede crecer sin que alguien la edite.
  const conocidas = cargarOmisionesConocidas(file);
  const nuevas = intolerables.filter((d) => !conocidas.has(d.id));
  const yaSabidas = intolerables.length - nuevas.length;

  // La lista se escribe desde aqui y no se transcribe a mano de un registro:
  // copiar el texto de un log introduce diferencias de espacios que hacen que
  // una omision ya anotada parezca nueva. Es explicito y ruidoso a proposito —
  // el fichero va en git, asi que cualquier crecimiento se ve en la revision.
  if (process.env.NELVYON_MIGRATE_WRITE_OMISSIONS === "1" && file === CONSOLIDATED_MIGRATION) {
    escribirOmisionesConocidas(intolerables);
    console.warn(
      `[migrate] ATENCION: reescrita la deuda conocida de ${file} con ${intolerables.length} omision(es).`,
    );
    return;
  }

  if (yaSabidas > 0) {
    console.warn(
      `[migrate] ${file}: ${yaSabidas} omision(es) YA CONOCIDAS (ver backend/db/omisiones_conocidas_507.json)`,
    );
  }

  if (nuevas.length > 0) {
    console.error(`[migrate] ${file}: ${nuevas.length} sentencia(s) NUEVAS que no se aplicaron:`);
    for (const d of nuevas) console.error(`  [${d.code}] ${d.preview}  ->  ${d.message}`);
    throw new Error(
      `${file}: ${nuevas.length} sentencia(s) fallaron y no estan en la deuda conocida. ` +
        `La migracion NO se registra como aplicada. Arreglalas, o si son inevitables ` +
        `anadelas a backend/db/omisiones_conocidas_507.json explicando por que.`,
    );
  }
}

/** Vuelca la deuda actual al fichero, con la sentencia y el motivo de cada una. */
function escribirOmisionesConocidas(omisiones: SentenciaOmitida[]): void {
  // Se deduplica por identidad porque la 507 contiene sentencias repetidas
  // —`CREATE INDEX api_keys_workspace_idx` aparece dos veces, heredado de dos
  // ficheros de servicio concatenados—, y la lista es de SENTENCIAS, no de
  // ocurrencias. Contar ocurrencias haria que el total bailara sin que la deuda
  // cambiara.
  const porId = new Map<string, { id: string; code: string; sentencia: string; motivo: string }>();
  for (const d of omisiones) {
    if (!porId.has(d.id)) {
      porId.set(d.id, { id: d.id, code: d.code, sentencia: d.preview, motivo: d.message });
    }
  }
  const unicas = [...porId.values()];

  const doc = {
    _lee_esto: [
      "Deuda conocida de la migracion 507 sobre una base LIMPIA.",
      "",
      "La 507 concatena el SQL de ~40 servicios FastAPI y no es coherente consigo",
      "misma: hay indices y politicas que referencian tablas o columnas que nadie",
      "crea, y una tabla (campaigns) que llega en la migracion 545, posterior.",
      "Durante meses eso no se vio porque el aplicador toleraba en silencio los",
      "codigos 42601 y 42P01 y registraba la migracion como aplicada igual. El",
      "resultado medido: produccion sin cinco tablas que tres servicios consultan.",
      "",
      "Ahora un fallo NO listado aqui rompe la migracion. Esta lista es la deuda",
      "que ya existia: no puede crecer sin que alguien la anada, y cada linea que",
      "se arregle debe borrarse de aqui.",
      "",
      "Solo se consulta al construir un esquema DESDE CERO. En una base donde la",
      "507 ya consta aplicada, la migracion se salta entera y esto no se mira.",
      "",
      "Se regenera con NELVYON_MIGRATE_WRITE_OMISSIONS=1, nunca a mano.",
    ],
    total: unicas.length,
    omisiones: unicas.sort(
      (a, b) => a.code.localeCompare(b.code) || a.sentencia.localeCompare(b.sentencia),
    ),
  };
  fs.writeFileSync(
    path.join(__dirname, "omisiones_conocidas_507.json"),
    `${JSON.stringify(doc, null, 2)}
`,
    "utf8",
  );
}

/**
 * Deuda conocida de una migracion consolidada. Si el fichero no esta, no hay
 * deuda tolerada y cualquier fallo rompe — que es el comportamiento estricto.
 */
function cargarOmisionesConocidas(file: string): Set<string> {
  if (file !== CONSOLIDATED_MIGRATION) return new Set();
  const ruta = path.join(__dirname, "omisiones_conocidas_507.json");
  if (!fs.existsSync(ruta)) return new Set();
  const doc = JSON.parse(fs.readFileSync(ruta, "utf8")) as {
    omisiones?: Array<{ id: string }>;
  };
  return new Set((doc.omisiones ?? []).map((o) => o.id));
}

runMigrations()
  .then(() => {
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[migrate] FATAL:", err);
    process.exit(1);
  });
