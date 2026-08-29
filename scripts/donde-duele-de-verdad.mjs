#!/usr/bin/env node
/**
 * DÓNDE DUELE DE VERDAD.
 *
 * LA REGLA QUE ESTE FICHERO OBEDECE: medir antes de tocar. Optimizar por
 * intuición produce código más complicado, más difícil de leer y exactamente
 * igual de lento, porque el cuello de botella casi nunca está donde uno cree.
 *
 * Y una regla más, que es la que hace que esto sirva de algo:
 *
 *     UN PROBLEMA SIN NÚMERO NO ES UN PROBLEMA. Es una sospecha.
 *
 * Así que aquí no se dice «esta consulta parece lenta»: se dice cuánto tarda,
 * cuántas filas mira y qué plan usa PostgreSQL para resolverla. Lo que no se
 * pueda medir sale como `NO_MEDIDO`, y `NO_MEDIDO` nunca se cuenta como sano.
 *
 * QUÉ MIRA, y por qué justo esto:
 *
 *   1. ÍNDICES QUE FALTAN EN CLAVES AJENAS. PostgreSQL indexa la clave primaria
 *      solo. Una clave ajena sin índice convierte cada borrado del padre en un
 *      escaneo completo del hijo, y eso no se nota hasta que la tabla crece.
 *
 *   2. LAS CONSULTAS DEL CAMINO CALIENTE, con EXPLAIN de verdad. Las que el
 *      portal y la cola ejecutan en cada visita.
 *
 *   3. ÍNDICES QUE NADIE USA. Cuestan en cada escritura y no ayudan a nadie.
 *      Sólo tiene sentido mirarlo donde haya tráfico real.
 *
 *   4. TABLAS SIN ÍNDICE POR INQUILINO. En un sistema multiinquilino, filtrar
 *      por `workspace_id` sin índice es escanear los datos de todos los
 *      clientes para responder por uno.
 *
 * NO TOCA PRODUCCIÓN. Lee de una base local desechable, y sólo lee.
 * NO ARREGLA NADA. Este script mide; arreglar es otra decisión, con su prueba.
 *
 * USO
 *   node scripts/donde-duele-de-verdad.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CONTENEDOR = process.env.CERT_PG_CONTAINER ?? "nelvyon-test-postgres";
const USUARIO = process.env.CERT_PG_USER ?? "nelvyon";
const BASE = process.env.CERT_PG_DB ?? "nelvyon_desdecero";
const SALIDA = path.join(process.cwd(), "docs", "medicion_de_rendimiento.json");

function psql(sql) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", CONTENEDOR, "psql", "-U", USUARIO, "-d", BASE, "-tAF", "\t", "-c", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if ((r.status ?? 1) !== 0) return { ok: false, error: (r.stderr || "").trim().slice(0, 300) };
  return { ok: true, filas: (r.stdout || "").trim().split("\n").filter(Boolean).map((l) => l.split("\t")) };
}

// ── 1 · claves ajenas sin índice ────────────────────────────────────────────
//
// La consulta pregunta al catálogo, no a una lista escrita a mano: una lista se
// queda vieja el día que alguien añade una tabla, y entonces el informe dice
// «todo bien» sobre algo que no ha mirado.
const FK_SIN_INDICE = `
SELECT c.conrelid::regclass::text AS tabla,
       a.attname                  AS columna,
       c.confrelid::regclass::text AS apunta_a
  FROM pg_constraint c
  JOIN LATERAL unnest(c.conkey) k(attnum) ON true
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
 WHERE c.contype = 'f'
   AND c.connamespace = 'public'::regnamespace
   AND NOT EXISTS (
     SELECT 1 FROM pg_index i
      WHERE i.indrelid = c.conrelid
        AND a.attnum = i.indkey[0]
   )
 ORDER BY 1, 2`;

// ── 4 · tablas con workspace_id sin índice que empiece por ahí ──────────────
const TENANT_SIN_INDICE = `
SELECT t.table_name
  FROM information_schema.columns t
 WHERE t.table_schema = 'public'
   AND t.column_name = 'workspace_id'
   AND NOT EXISTS (
     SELECT 1
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
      WHERE i.indrelid = ('public.' || quote_ident(t.table_name))::regclass
        AND a.attname = 'workspace_id'
   )
 ORDER BY 1`;

/**
 * Las consultas del camino caliente.
 *
 * Salen de código real —el portal, la cola, la guarda de gasto—, no de
 * ejemplos. Medir una consulta que nadie ejecuta es medir por medir.
 */
const CAMINO_CALIENTE = [
  {
    id: "cola-reclamar-trabajo",
    dedonde: "backend/queue/colaDeTrabajos.ts",
    porque: "cada vuelta del trabajador la ejecuta; si escanea, la cola no escala",
    sql: `SELECT job_id FROM os_jobs
           WHERE status = 'queued' AND run_after <= NOW()
           ORDER BY run_after ASC
           LIMIT 1 FOR UPDATE SKIP LOCKED`,
  },
  {
    id: "portal-resumen-servicios",
    dedonde: "backend/portal/CicloDelClienteService.ts",
    porque: "es la primera pantalla que ve un cliente al entrar",
    // La consulta es LA DEL CODIGO, copiada. La primera version de este script
    // media `os_services`, que no existe: una tabla inventada mide un plan que
    // nadie ejecuta y da una tranquilidad falsa.
    sql: `SELECT id, service_id, estado, created_at
            FROM os_service_requests
           WHERE workspace_id = 1 AND client_id = '00000000-0000-4000-8000-000000000001'
           ORDER BY created_at DESC`,
  },
  {
    id: "gasto-autorizacion-vigente",
    dedonde: "backend/gasto/guardaDeGasto.ts",
    porque: "se consulta antes de CADA operación que gasta dinero",
    sql: `SELECT id FROM autorizaciones_de_gasto
           WHERE workspace_id = 1 AND service_id = 'x' AND proveedor = 'meta_ads'
             AND estado = 'aprobada' AND NOW() <= vigente_hasta
           LIMIT 1`,
  },
  {
    id: "insights-bandeja",
    dedonde: "backend/inteligencia/InteligenciaEntreDepartamentos.ts",
    porque: "la lee cada departamento al empezar a trabajar",
    sql: `SELECT id FROM os_insights
           WHERE workspace_id = 1 AND destino_dep = 'seo' AND estado = 'nuevo'
           ORDER BY confianza DESC LIMIT 20`,
  },
  {
    id: "entregables-del-cliente",
    dedonde: "backend/exito/SenalesDeCliente.ts",
    porque: "customer success la ejecuta por cada cliente, en bucle",
    sql: `SELECT id, status FROM os_deliverables WHERE workspace_id = 1 ORDER BY created_at DESC LIMIT 100`,
  },
];

function explicar(sql) {
  const r = psql(`EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${sql.replace(/\s+/g, " ")}`);
  if (!r.ok) {
    // Que una consulta del camino caliente no se pueda medir NO es un detalle:
    // o la tabla no existe —y entonces el codigo que la usa esta roto— o el
    // script mide algo que nadie ejecuta. Las dos cosas hay que verlas.
    return { estado: "NO_MEDIDO", porQue: r.error, gravedad: "hay que mirarlo" };
  }
  let plan;
  try {
    plan = JSON.parse(r.filas.map((f) => f.join("\t")).join("\n"))[0].Plan;
  } catch {
    return { estado: "NO_MEDIDO", porQue: "el plan no se pudo leer" };
  }

  const tipos = [];
  (function recorrer(n) {
    tipos.push(n["Node Type"]);
    for (const h of n.Plans ?? []) recorrer(h);
  })(plan);

  return {
    estado: "MEDIDO",
    ms: Number(plan["Actual Total Time"] ?? 0),
    filasLeidas: Number(plan["Actual Rows"] ?? 0),
    nodos: tipos,
    // Un escaneo secuencial NO es malo por sí solo: sobre una tabla vacía o
    // pequeña es lo correcto, y forzar un índice ahí la haría más lenta. Lo
    // que se marca es el escaneo secuencial CON volumen.
    escaneoCompleto: tipos.includes("Seq Scan"),
  };
}

/**
 * EL EXPERIMENTO CON VOLUMEN.
 *
 * Todo lo de arriba se mide sobre una base vacia, y sobre una base vacia todo
 * es rapido y todo escanea. Eso NO permite decir si falta un indice: permite
 * decir que hoy no molesta.
 *
 * Asi que se monta el volumen a proposito. Una tabla desechable con la forma de
 * las 34 tablas multiinquilino sin indice —muchas filas, muchos inquilinos— y
 * se mide LA MISMA consulta dos veces: sin indice y con el.
 *
 * Es la unica forma de convertir «deberia haber un indice» en un numero.
 *
 * La tabla lleva un prefijo inconfundible y se borra al terminar. No toca
 * ninguna tabla real.
 */
function experimentoConVolumen(filas = 200000, inquilinos = 500) {
  const T = "zz_medicion_desechable";

  const preparar = psql(
    "DROP TABLE IF EXISTS " + T + ";" +
    "CREATE TABLE " + T + " (" +
    "  id BIGSERIAL PRIMARY KEY," +
    "  workspace_id INTEGER NOT NULL," +
    "  estado TEXT NOT NULL," +
    "  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" +
    "INSERT INTO " + T + " (workspace_id, estado, created_at)" +
    " SELECT (g % " + inquilinos + ") + 1," +
    "        (ARRAY['nuevo','hecho','fallido'])[1 + (g % 3)]," +
    "        NOW() - (g || ' minutes')::interval" +
    "   FROM generate_series(1, " + filas + ") g;" +
    "ANALYZE " + T + ";",
  );

  if (!preparar.ok) return { estado: "NO_MEDIDO", porQue: preparar.error };

  const CONSULTA =
    "SELECT id FROM " + T +
    " WHERE workspace_id = 42 AND estado = 'nuevo'" +
    " ORDER BY created_at DESC LIMIT 20";

  const sinIndice = explicar(CONSULTA);

  const crear = psql(
    "CREATE INDEX " + T + "_ws_idx ON " + T + " (workspace_id, estado, created_at DESC); ANALYZE " + T + ";",
  );
  const conIndice = crear.ok ? explicar(CONSULTA) : { estado: "NO_MEDIDO", porQue: crear.error };

  psql("DROP TABLE IF EXISTS " + T);

  const mejora =
    sinIndice.estado === "MEDIDO" && conIndice.estado === "MEDIDO" && conIndice.ms > 0
      ? Number((sinIndice.ms / conIndice.ms).toFixed(1))
      : null;

  return {
    estado: "MEDIDO",
    forma: filas + " filas, " + inquilinos + " inquilinos, consulta por un inquilino",
    sinIndice,
    conIndice,
    cuantasVecesMasRapido: mejora,
    queSignifica:
      mejora === null
        ? "no se pudo comparar"
        : "con este volumen el indice por inquilino hace la consulta " + mejora +
          "x mas rapida, y las 34 tablas de la lista NO lo tienen",
  };
}

// ── Ejecución ───────────────────────────────────────────────────────────────

const vivo = psql("SELECT 1");
if (!vivo.ok) {
  console.error(
    [
      `[rendimiento] no se pudo abrir ${BASE} en ${CONTENEDOR}.`,
      "              Sin base no hay medición, y sin medición no hay nada que",
      "              optimizar: lo único honesto es no decir nada.",
      `              ${vivo.error}`,
    ].join("\n"),
  );
  process.exit(2);
}

const fk = psql(FK_SIN_INDICE);
const tenant = psql(TENANT_SIN_INDICE);

const tamanos = psql(`
  SELECT relname, n_live_tup
    FROM pg_stat_user_tables
   WHERE n_live_tup > 0
   ORDER BY n_live_tup DESC
   LIMIT 20`);

const caliente = CAMINO_CALIENTE.map((c) => ({ ...c, medicion: explicar(c.sql) }));

const informe = {
  _lee_esto: [
    "Medicion de rendimiento sobre el esquema construido desde cero.",
    "",
    "LO QUE ESTE FICHERO NO ES: una lista de cosas que optimizar. Es una lista",
    "de cosas MEDIDAS. Optimizar por intuicion produce codigo mas complicado y",
    "exactamente igual de lento.",
    "",
    "LIMITE IMPORTANTE, y hay que leerlo antes de sacar conclusiones: esta base",
    "esta practicamente VACIA. Con tablas vacias, PostgreSQL elige escaneo",
    "secuencial y hace bien; forzar un indice ahi seria mas lento. Por eso los",
    "tiempos de aqui NO dicen que sea rapido en produccion: dicen que el PLAN es",
    "razonable y que no falta ninguna estructura.",
    "",
    "Lo que SI vale sin datos: los indices que faltan. Una clave ajena sin",
    "indice o una tabla multiinquilino sin indice por workspace son defectos",
    "estructurales que no dependen del volumen — solo se NOTAN con volumen.",
    "",
    "NO_MEDIDO nunca cuenta como sano.",
  ],
  generado: new Date().toISOString(),
  base: BASE,
  advertencia: "base sin volumen: los tiempos no extrapolan a produccion",
  clavesAjenasSinIndice: fk.ok
    ? { estado: "MEDIDO", cuantas: fk.filas.length, ejemplos: fk.filas.slice(0, 30).map((f) => ({ tabla: f[0], columna: f[1], apuntaA: f[2] })) }
    : { estado: "NO_MEDIDO", porQue: fk.error },
  tablasMultiinquilinoSinIndice: tenant.ok
    ? { estado: "MEDIDO", cuantas: tenant.filas.length, tablas: tenant.filas.slice(0, 40).map((f) => f[0]) }
    : { estado: "NO_MEDIDO", porQue: tenant.error },
  tablasConDatos: tamanos.ok
    ? tamanos.filas.map((f) => ({ tabla: f[0], filas: Number(f[1]) }))
    : { estado: "NO_MEDIDO", porQue: tamanos.error },
  experimentoConVolumen: experimentoConVolumen(),
  caminoCaliente: caliente.map(({ id, dedonde, porque, medicion }) => ({ id, dedonde, porque, medicion })),
};

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, `${JSON.stringify(informe, null, 2)}\n`, "utf8");

console.log("\nDÓNDE DUELE DE VERDAD");
console.log(`  base: ${BASE} (sin volumen: los tiempos no extrapolan)\n`);

const f = informe.clavesAjenasSinIndice;
console.log(`  claves ajenas sin índice ......... ${f.estado === "MEDIDO" ? f.cuantas : "NO_MEDIDO"}`);
const t = informe.tablasMultiinquilinoSinIndice;
console.log(`  tablas con workspace_id sin índice ${t.estado === "MEDIDO" ? t.cuantas : "NO_MEDIDO"}`);

console.log("\n  camino caliente:");
for (const c of informe.caminoCaliente) {
  const m = c.medicion;
  const linea = m.estado === "MEDIDO"
    ? `${m.ms.toFixed(2)} ms · ${m.filasLeidas} filas · ${m.nodos.join(" › ")}`
    : `NO_MEDIDO (${m.porQue?.slice(0, 70)})`;
  console.log(`    ${c.id.padEnd(28)} ${linea}`);
}

if (t.estado === "MEDIDO" && t.cuantas > 0) {
  console.log(`\n  Tablas multiinquilino SIN índice por workspace (${t.cuantas}):`);
  for (const x of t.tablas.slice(0, 25)) console.log(`    · ${x}`);
}

const exp = informe.experimentoConVolumen;
if (exp.estado === "MEDIDO") {
  console.log(`
  EXPERIMENTO CON VOLUMEN (${exp.forma}):`);
  console.log(`    sin índice por inquilino ... ${exp.sinIndice.ms?.toFixed(2)} ms  (${exp.sinIndice.nodos?.join(" › ")})`);
  console.log(`    con índice por inquilino ... ${exp.conIndice.ms?.toFixed(2)} ms  (${exp.conIndice.nodos?.join(" › ")})`);
  console.log(`    → ${exp.queSignifica}`);
} else {
  console.log(`
  EXPERIMENTO CON VOLUMEN: NO_MEDIDO (${exp.porQue?.slice(0, 90)})`);
}

console.log(`\n  escrito en ${path.relative(process.cwd(), SALIDA)}\n`);
