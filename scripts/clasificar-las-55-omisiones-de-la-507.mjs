#!/usr/bin/env node
/**
 * LAS 55 SENTENCIAS QUE LA MIGRACIÓN 507 NO LLEGA A APLICAR.
 *
 * QUÉ SON. La 507 concatena el SQL de unos cuarenta servicios FastAPI y no es
 * coherente consigo misma: crea índices sobre columnas que nadie declara y
 * políticas sobre tablas que llegan en migraciones posteriores. Durante meses
 * el aplicador se tragó esos fallos en silencio y anotó la migración como
 * aplicada igual. El resultado medido en producción: cinco tablas que faltan y
 * tres servicios que las consultan.
 *
 * POR QUÉ NO BASTA CON CONTARLAS. «55 sentencias pendientes» no es información
 * accionable: mete en el mismo saco un índice que otra migración ya creó —
 * inofensivo— y una tabla que el código consulta hoy — que es el fallo que ya
 * costó caro. Aprobarlas o descartarlas en bloque obliga a tratar la más
 * inocua con el mismo miedo que la peligrosa.
 *
 * LAS CINCO CLASES, y cada una se decide con evidencia medida, no leyendo:
 *
 *   EXPECTED_IDEMPOTENT    el objeto EXISTE en el esquema final: otra migración
 *                          lo creó después. El fallo era de orden, y no dejó
 *                          nada sin hacer. No hay que tocar nada.
 *
 *   LEGACY_COMPATIBILITY   el objeto no existe, pero tampoco lo referencia
 *                          ningún código vivo: es SQL de un servicio que ya no
 *                          está. Se documenta y se deja morir.
 *
 *   REAL_DEFECT            el objeto NO existe Y el código lo consulta. Éste es
 *                          el fallo que ya se pagó: no se ve hasta que alguien
 *                          entra en esa pantalla.
 *
 *   OBSOLETE               la tabla entera no existe en el esquema final y
 *                          nadie la nombra. Sobra.
 *
 *   NEEDS_REPAIR           la sentencia está mal escrita o quedaría fallando
 *                          aunque el objeto existiese.
 *
 * CÓMO SE DECIDE, y esto es lo que hace que el resultado valga:
 *
 *   1. Se consulta el ESQUEMA FINAL de verdad — una base construida desde cero
 *      con las 477 migraciones — no lo que el fichero de la 507 dice.
 *   2. Se busca cada tabla en el CÓDIGO VIVO del árbol.
 *   3. Sólo entonces se asigna clase. Sin base o sin árbol: `DESCONOCIDO`, y
 *      `DESCONOCIDO` nunca se cuenta como resuelto.
 *
 * NO TOCA PRODUCCIÓN. Sólo lee, y lee de una base local desechable.
 *
 * USO
 *   NELVYON_COLA_CERT_DSN=postgres://... node scripts/clasificar-las-55-omisiones-de-la-507.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const FICHERO = path.join(RAIZ, "backend", "db", "omisiones_conocidas_507.json");
const SALIDA = path.join(RAIZ, "backend", "db", "clasificacion_507.json");

const CONTENEDOR = process.env.CERT_PG_CONTAINER ?? "nelvyon-test-postgres";
const USUARIO = process.env.CERT_PG_USER ?? "nelvyon";
const BASE = process.env.CERT_PG_DB ?? "nelvyon_desdecero";

function psql(sql) {
  const r = spawnSync(
    "docker",
    ["exec", "-i", CONTENEDOR, "psql", "-U", USUARIO, "-d", BASE, "-tAF", "\t", "-c", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if ((r.status ?? 1) !== 0) return null;
  return (r.stdout || "").trim();
}

/**
 * Qué objeto pretende tocar cada sentencia.
 *
 * Deliberadamente conservador: si no se reconoce la forma, se devuelve `null`
 * y la sentencia acaba en DESCONOCIDO. Adivinar mal aquí produciría una
 * clasificación tranquilizadora y falsa, que es peor que no tener ninguna.
 */
function objetivoDe(sentencia) {
  const s = sentencia.replace(/\s+/g, " ").trim();

  // El `$` del final dejaba fuera los índices PARCIALES (`... WHERE x IS NOT
  // NULL`), que eran cinco de las siete sentencias sin clasificar. Ahora la
  // cláusula WHERE se admite y se ignora para extraer columnas.
  let m = /^CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?(\S+) ON (?:ONLY )?([A-Za-z0-9_."]+)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)(?:\s+WHERE\s+.+)?$/i.exec(s);
  if (m) return { tipo: "indice", nombre: m[1], tabla: limpiar(m[2]), columnas: columnasDe(m[3]) };

  m = /^CREATE TABLE (?:IF NOT EXISTS )?([A-Za-z0-9_."]+)\s*\(/i.exec(s);
  if (m) return { tipo: "tabla", tabla: limpiar(m[1]), columnas: [] };

  // Un bloque DO recorre una lista de tablas. Se marca aparte: clasificarlo
  // como si fuera una sola sentencia sobre una sola tabla sería mentir.
  if (/^DO \$\$/i.test(s)) {
    const tablas = [...s.matchAll(/'([a-z_][a-z0-9_]*)'/gi)].map((x) => x[1]);
    return { tipo: "bloque", tabla: null, tablas, columnas: [] };
  }

  m = /^ALTER TABLE (?:IF EXISTS )?([A-Za-z0-9_."]+) ALTER COLUMN (\S+) /i.exec(s);
  if (m) return { tipo: "columna", tabla: limpiar(m[1]), columnas: [limpiar(m[2])] };

  m = /^ALTER TABLE (?:IF EXISTS )?([A-Za-z0-9_."]+) ADD COLUMN (?:IF NOT EXISTS )?(\S+) /i.exec(s);
  if (m) return { tipo: "columna", tabla: limpiar(m[1]), columnas: [limpiar(m[2])] };

  m = /^ALTER TABLE (?:IF EXISTS )?([A-Za-z0-9_."]+) ENABLE ROW LEVEL SECURITY$/i.exec(s);
  if (m) return { tipo: "rls", tabla: limpiar(m[1]), columnas: [] };

  m = /^CREATE POLICY \S+ ON ([A-Za-z0-9_."]+)/i.exec(s);
  if (m) return { tipo: "politica", tabla: limpiar(m[1]), columnas: columnasDe(s) };

  m = /^ALTER TABLE (?:IF EXISTS )?([A-Za-z0-9_."]+) ADD CONSTRAINT/i.exec(s);
  if (m) return { tipo: "restriccion", tabla: limpiar(m[1]), columnas: columnasDe(s) };

  m = /^(?:CREATE|DROP) TRIGGER \S+ (?:BEFORE|AFTER|ON) .*? ON ([A-Za-z0-9_."]+)/i.exec(s);
  if (m) return { tipo: "trigger", tabla: limpiar(m[1]), columnas: [] };

  return null;
}

const limpiar = (x) => x.replace(/"/g, "").replace(/^public\./i, "").trim();

function columnasDe(txt) {
  return [...txt.matchAll(/\b([a-z_][a-z0-9_]*)\b/gi)]
    .map((x) => x[1].toLowerCase())
    .filter((x) => !PALABRAS.has(x));
}

const PALABRAS = new Set([
  "create", "index", "unique", "on", "using", "btree", "gin", "gist", "desc", "asc",
  "where", "and", "or", "not", "null", "is", "true", "false", "alter", "table", "column",
  "add", "drop", "constraint", "policy", "for", "all", "select", "insert", "update",
  "delete", "to", "with", "check", "public", "current", "setting", "text", "uuid",
  "integer", "boolean", "timestamptz", "jsonb", "if", "exists", "nulls", "last", "first",
  "coalesce", "lower", "upper", "enable", "row", "level", "security", "as", "in", "only",
]);

// ── El esquema final, medido ────────────────────────────────────────────────

const tablasSql = psql(
  `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1`,
);
if (tablasSql === null) {
  console.error(
    `[507] no se pudo leer el esquema de ${BASE} en ${CONTENEDOR}.\n` +
    `      Sin base, TODO queda DESCONOCIDO y eso no clasifica nada.`,
  );
  process.exit(2);
}
const TABLAS = new Set(tablasSql.split("\n").filter(Boolean));

const columnasSql = psql(
  `SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema='public'`,
);
const COLUMNAS = new Set((columnasSql ?? "").split("\n").filter(Boolean));

const indicesSql = psql(`SELECT indexname FROM pg_indexes WHERE schemaname='public'`);
const INDICES = new Set((indicesSql ?? "").split("\n").filter(Boolean));

// ── El código vivo ──────────────────────────────────────────────────────────

/**
 * ¿Alguien consulta esta tabla?
 *
 * Se busca el nombre en contexto SQL, no suelto: `affiliate_clicks` como texto
 * aparece en comentarios y en la propia migración, y contar eso daría por vivo
 * lo que sólo está mencionado.
 */
const CACHE = new Map();

/**
 * El buscador, elegido UNA VEZ y comprobado.
 *
 * `rg` no está en todas las máquinas. La primera versión de este script lo
 * llamaba sin mirar si existía, y un `rg` ausente devolvía cero líneas — que se
 * leía como «nadie usa esta tabla». Es decir: la avería del buscador producía
 * la respuesta MÁS TRANQUILIZADORA posible, y en silencio.
 *
 * Ahora se prueba con un control positivo antes de clasificar nada: si buscando
 * una tabla que se sabe viva no aparece nada, el buscador está roto y el script
 * se para. Una clasificación construida sobre un buscador mudo no vale nada.
 */
function elegirBuscador() {
  const candidatos = [
    { cmd: "rg", args: (re) => [
        "--no-heading", "-n", "-i",
        "-g", "!node_modules", "-g", "!*.json", "-g", "!backend/db/migrations/**",
        "-g", "!scripts/**", "-g", "!**/__tests__/**", "-g", "!docs/**",
        // La primera versión contaba `.next/cache/*.pack` y `logs/app.log`
        // como código vivo. Un blob de webpack no consulta nada, y una línea
        // de registro es la huella de una consulta pasada, no una consulta.
        "-g", "!**/.next/**", "-g", "!**/dist/**", "-g", "!**/build/**",
        "-g", "!**/coverage/**", "-g", "!**/logs/**", "-g", "!*.log", "-g", "!*.pack",
        "-g", "!**/tests/**", "-g", "!*.txt", "-g", "!*.out",
        "-g", "!**/.pytest_cache/**",
        re, RAIZ,
      ] },
    { cmd: "grep", args: (re) => [
        "-rniE",
        "--exclude-dir=node_modules", "--exclude-dir=migrations",
        "--exclude-dir=scripts", "--exclude-dir=__tests__", "--exclude-dir=docs",
        "--exclude-dir=.next", "--exclude-dir=dist", "--exclude-dir=build",
        "--exclude-dir=coverage", "--exclude-dir=logs",
        "--exclude=*.json", "--exclude=*.log", "--exclude=*.pack", "-I",
        // `backend/tests` no es `__tests__`, y `pytest_out.txt` es la SALIDA
        // de una ejecución, no código. Los dos se colaron como «código vivo».
        "--exclude-dir=tests", "--exclude=*.txt", "--exclude=*.out",
        "--exclude-dir=.pytest_cache", "--exclude-dir=.git",
        re, RAIZ,
      ] },
  ];

  const CONTROL = "(FROM|JOIN|INTO|UPDATE|TABLE)[[:space:]]+os_clients";
  for (const c of candidatos) {
    const r = spawnSync(c.cmd, c.args(CONTROL), { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const lineas = (r.stdout || "").split("\n").filter(Boolean);
    if (lineas.length > 0) return c;
  }
  return null;
}

const BUSCADOR = elegirBuscador();
if (!BUSCADOR) {
  console.error(
    [
      "[507] el control positivo del buscador ha fallado: buscando `os_clients`,",
      "      que el árbol usa con certeza, no aparece nada.",
      "      Sin buscador, TODO saldría como «nadie la usa» — la respuesta más",
      "      tranquilizadora y falsa. No se clasifica nada.",
    ].join("\n"),
  );
  process.exit(2);
}

/**
 * ¿Alguien consulta esta tabla?
 *
 * Se busca el nombre en contexto SQL, no suelto: `affiliate_clicks` como texto
 * aparece en comentarios y en la propia migración, y contar eso daría por vivo
 * lo que sólo está mencionado.
 */
function alguienLaUsa(tabla) {
  if (CACHE.has(tabla)) return CACHE.get(tabla);
  const re = `(FROM|JOIN|INTO|UPDATE|TABLE)[[:space:]]+${tabla}`;
  const r = spawnSync(BUSCADOR.cmd, BUSCADOR.args(re), {
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  const lineas = (r.stdout || "")
    .split("\n")
    .filter(Boolean)
    // El propio informe y este script nombran las tablas: no cuentan como uso.
    .filter((l) => !/clasificacion_507|omisiones_conocidas_507|clasificar-las-55/.test(l));
  const v = { usada: lineas.length > 0, ejemplos: lineas.slice(0, 3), todos: lineas };
  CACHE.set(tabla, v);
  return v;
}

/**
 * ¿Alguien consulta ESTA COLUMNA de esta tabla?
 *
 * Tres intentos, y los dos primeros fallaron en direcciones opuestas:
 *
 *   1. «el código toca la tabla» → doce defectos falsos. `calendar_events` la
 *      consulta medio árbol, pero por `tenant_id` y `event_date`, que existen.
 *   2. «tabla y columna en el mismo fichero» → falsos otra vez.
 *      `calendar_service.py` tiene un atributo Python llamado `workspace_id`
 *      que no es una columna de nada.
 *
 * Éste mira una VENTANA alrededor de donde se nombra la tabla, que es lo más
 * cerca que se puede estar de «en la misma sentencia» sin escribir un analizador
 * de SQL. Sigue siendo una aproximación, y por eso lo que sale marca su
 * confianza en vez de presentarse como certeza.
 */
const VENTANA = 8;

/**
 * El trozo de SQL alrededor de donde se nombra la tabla.
 *
 * Cuarto intento, y los tres anteriores fallaron cada uno por su lado:
 * el fichero entero (atributos de Python que se llaman igual que columnas), la
 * ventana con comentarios (notas que EXPLICAN que el fallo ya se arregló), y la
 * ventana sin comentarios (variables locales como `endpoint_id`, que en
 * `webhook_service.py` es un uuid de Python y no una columna de nada).
 *
 * Lo que queda: la ventana, sin comentarios, y descartando además las líneas
 * que son código del lenguaje anfitrión en vez de SQL — una asignación, un
 * `def`, un `if`. Lo que sobrevive es, con mucha aproximación, la sentencia.
 *
 * Sigue sin ser un analizador de SQL, y por eso lo que sale de aquí se publica
 * como CANDIDATO con su evidencia de línea, para que se confirme mirándolo. No
 * como veredicto.
 */
function sqlAlrededor(lineas, centro) {
  return lineas
    .slice(Math.max(0, centro - VENTANA), centro + VENTANA + 1)
    .filter((l) => !/^\s*(--|#|\/\/|\*|\/\*)/.test(l))
    .filter((l) => !/^\s*(def |class |return |import |from \w+ import|const |let |var |function )/.test(l))
    // Una asignación del lenguaje anfitrión (`endpoint_id = str(uuid4())`)
    // sólo cuenta si además lleva SQL dentro.
    .filter((l) => !/^\s*[\w.]+\s*=\s*/.test(l) || /(SELECT|FROM|WHERE|INSERT|UPDATE|JOIN|VALUES|ORDER BY|GROUP BY)/i.test(l))
    .join("\n");
}

function alguienUsaLaColumna(tabla, columna) {
  const uso = alguienLaUsa(tabla);
  if (!uso.usada) return { usada: false, ficheros: [] };

  const re = new RegExp(`\\b${columna}\\b`);
  const aciertos = [];

  for (const linea of uso.todos) {
    const m = /^(.*?):(\d+):/.exec(linea);
    if (!m) continue;
    const [, fichero, n] = m;
    let texto;
    try {
      texto = fs.readFileSync(fichero, "utf8").split("\n");
    } catch {
      continue;
    }
    if (re.test(sqlAlrededor(texto, Number(n) - 1))) aciertos.push(`${fichero}:${n}`);
  }

  return { usada: aciertos.length > 0, ficheros: aciertos.slice(0, 3) };
}

/** `C:
utaichero.ts:12:texto` → `C:
utaichero.ts` (la unidad lleva `:`). */
function nombreDeFichero(linea) {
  const m = /^(.*?):\d+:/.exec(linea);
  return m ? m[1] : linea;
}

/**
 * CONTROL POSITIVO DEL DETECTOR DE COLUMNAS.
 *
 * `alguienUsaLaColumna` decide doce veredictos. Si devolviera `false` siempre
 * -por una expresion mal escrita, por un buscador que no entiende los limites
 * de palabra- el informe saldria entero en LEGACY_COMPATIBILITY: otra vez la
 * respuesta mas tranquilizadora posible, y otra vez en silencio.
 *
 * Asi que se le pregunta por algo que se sabe cierto antes de fiarse de el.
 */
{
  const prueba = alguienUsaLaColumna("os_clients", "workspace_id");
  if (!prueba.usada) {
    console.error(
      [
        "[507] el detector de columnas ha fallado su control positivo:",
        "      dice que nadie usa `os_clients.workspace_id`, y medio arbol lo usa.",
        "      Con el roto TODO saldria como LEGACY_COMPATIBILITY. No se clasifica nada.",
      ].join("\n"),
    );
    process.exit(2);
  }
}

// ── Clasificación ───────────────────────────────────────────────────────────

function clasificar(om) {
  const obj = objetivoDe(om.sentencia);
  if (!obj) {
    return {
      clase: "DESCONOCIDO",
      porQue: "no se reconoce la forma de la sentencia; clasificarla a ojo sería inventar",
    };
  }

  // Un bloque DO recorre varias tablas. Se resuelve mirándolas todas: si a
  // alguna le falta algo que el código usa, el bloque cuenta como defecto.
  if (obj.tipo === "bloque") {
    const faltan = (obj.tablas ?? []).filter((t) => !TABLAS.has(t));
    if (faltan.length === 0) {
      return {
        clase: "EXPECTED_IDEMPOTENT",
        porQue: `las ${obj.tablas.length} tablas del bloque existen en el esquema final`,
      };
    }
    const vivas = faltan.filter((t) => alguienLaUsa(t).usada);
    return vivas.length > 0
      ? {
          clase: "REAL_DEFECT",
          impacto: "correccion",
          porQue: `el bloque toca ${faltan.length} tabla(s) ausentes y el código consulta: ${vivas.join(", ")}`,
        }
      : {
          clase: "OBSOLETE",
          porQue: `el bloque toca ${faltan.length} tabla(s) que no existen y nadie consulta`,
        };
  }

  const tablaExiste = TABLAS.has(obj.tabla);

  // ── 1 · ¿el objeto concreto ya está en el esquema final? ────────────────
  if (obj.tipo === "indice" && INDICES.has(obj.nombre)) {
    return {
      clase: "EXPECTED_IDEMPOTENT",
      porQue: `el índice ${obj.nombre} existe en el esquema final: otra migración lo creó después`,
    };
  }
  if (obj.tipo === "tabla" && tablaExiste) {
    return {
      clase: "EXPECTED_IDEMPOTENT",
      porQue: `${obj.tabla} existe en el esquema final; otra migración la crea`,
    };
  }
  if (obj.tipo === "columna" && obj.columnas.every((c) => COLUMNAS.has(`${obj.tabla}.${c}`))) {
    return {
      clase: "EXPECTED_IDEMPOTENT",
      porQue: `${obj.tabla}.${obj.columnas.join(",")} existe en el esquema final`,
    };
  }
  if ((obj.tipo === "rls" || obj.tipo === "politica" || obj.tipo === "trigger" ||
       obj.tipo === "restriccion") && tablaExiste) {
    return {
      clase: "EXPECTED_IDEMPOTENT",
      porQue: `${obj.tabla} existe en el esquema final; la 507 se adelantó a la migración que la crea`,
      revisarAparte: obj.tipo === "politica" || obj.tipo === "rls"
        ? `comprobar que ${obj.tabla} acabe con RLS activo`
        : undefined,
    };
  }

  // ── 2 · la tabla entera no está ─────────────────────────────────────────
  const uso = alguienLaUsa(obj.tabla);

  if (!tablaExiste) {
    return uso.usada
      ? {
          clase: "REAL_DEFECT",
          impacto: "correccion",
          porQue: `${obj.tabla} NO existe en el esquema final y el código la consulta`,
          evidencia: uso.ejemplos,
        }
      : {
          clase: "OBSOLETE",
          porQue: `${obj.tabla} no existe en el esquema final y ningún código la consulta`,
        };
  }

  // ── 3 · la tabla está; ¿qué le falta exactamente? ───────────────────────
  const faltan = obj.columnas.filter((c) => !COLUMNAS.has(`${obj.tabla}.${c}`));

  if (obj.tipo === "indice" && faltan.length === 0) {
    // ESTE ES EL CASO QUE LA PRIMERA VERSIÓN CONFUNDÍA. La tabla está, todas
    // sus columnas están, y lo único que falta es EL ÍNDICE. Nada se rompe:
    // las consultas devuelven lo correcto, sólo que escaneando. Es una deuda
    // de rendimiento con arreglo trivial —volver a lanzar la sentencia—, no
    // un objeto ausente que el código necesite para funcionar.
    return uso.usada
      ? {
          clase: "NEEDS_REPAIR",
          impacto: "rendimiento",
          porQue: `${obj.tabla} y sus columnas existen; falta sólo el índice ${obj.nombre}, y la tabla se consulta`,
          evidencia: uso.ejemplos,
        }
      : {
          clase: "LEGACY_COMPATIBILITY",
          porQue: `falta el índice ${obj.nombre} sobre ${obj.tabla}, que ningún código vivo consulta`,
        };
  }

  // EL LISTÓN, y subirlo cambió doce veredictos. No basta con que el código
  // toque la tabla: tiene que necesitar LA COLUMNA QUE FALTA. `calendar_events`
  // la consulta medio árbol, pero por `tenant_id` y `event_date`, que existen.
  const usadas = faltan.filter((c) => alguienUsaLaColumna(obj.tabla, c));
  const conUso = faltan.filter((c) => alguienUsaLaColumna(obj.tabla, c).usada);
  void usadas;

  if (conUso.length > 0) {
    const ev = alguienUsaLaColumna(obj.tabla, conUso[0]);
    return {
      clase: "REAL_DEFECT",
      impacto: "correccion",
      confianza: "aproximada: tabla y columna aparecen en el mismo fichero",
      porQue: `a ${obj.tabla} le falta ${conUso.join(", ")}, y hay código que la nombra`,
      evidencia: ev.ficheros,
    };
  }

  return {
    clase: "LEGACY_COMPATIBILITY",
    porQue:
      `${obj.tabla} existe sin ${faltan.join(", ")}. La tabla sí se consulta, pero ` +
      `por otras columnas: la 507 habla de una forma anterior del esquema`,
  };
}

// ── Ejecución ───────────────────────────────────────────────────────────────

const datos = JSON.parse(fs.readFileSync(FICHERO, "utf8"));
const resultados = datos.omisiones.map((om) => ({
  id: om.id,
  code: om.code,
  sentencia: om.sentencia,
  motivoOriginal: om.motivo,
  ...clasificar(om),
}));

const cuenta = {};
for (const r of resultados) cuenta[r.clase] = (cuenta[r.clase] ?? 0) + 1;

const informe = {
  _lee_esto: [
    "Clasificacion de las 55 sentencias que la migracion 507 no aplica.",
    "",
    "Medido contra el esquema construido DESDE CERO con las 477 migraciones,",
    "no contra lo que dice el fichero de la 507. Y contra el codigo vivo del",
    "arbol, para saber si a alguien le hace falta lo que falta.",
    "",
    "Lo unico que hay que mirar con prisa es REAL_DEFECT: son objetos que no",
    "existen y que el codigo consulta. El resto esta explicado y acotado.",
    "",
    "DESCONOCIDO no es una clase: es la ausencia de una. Nunca cuenta como",
    "resuelto.",
    "",
    "Se regenera con scripts/clasificar-las-55-omisiones-de-la-507.mjs",
  ],
  generado: new Date().toISOString(),
  esquemaMedido: { base: BASE, tablas: TABLAS.size, indices: INDICES.size },
  total: resultados.length,
  cuenta,
  resultados,
};

fs.writeFileSync(SALIDA, `${JSON.stringify(informe, null, 2)}\n`, "utf8");

console.log("\nLAS 55 SENTENCIAS DE LA 507, CLASIFICADAS");
console.log(`  esquema medido: ${BASE} · ${TABLAS.size} tablas · ${INDICES.size} índices\n`);
for (const [clase, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${clase}`);
}

const defectos = resultados.filter((r) => r.clase === "REAL_DEFECT");
if (defectos.length > 0) {
  console.log(`\n  LO QUE HAY QUE MIRAR (${defectos.length}):`);
  for (const d of defectos) {
    console.log(`    · ${d.sentencia.slice(0, 100)}`);
    console.log(`      ${d.porQue}`);
    for (const e of d.evidencia ?? []) console.log(`      ${e.slice(0, 140)}`);
  }
}

const desconocidos = resultados.filter((r) => r.clase === "DESCONOCIDO");
if (desconocidos.length > 0) {
  console.log(`\n  SIN CLASIFICAR (${desconocidos.length}) — no cuentan como resueltas:`);
  for (const d of desconocidos) console.log(`    · ${d.sentencia.slice(0, 110)}`);
}

console.log(`\n  escrito en ${path.relative(RAIZ, SALIDA)}\n`);
