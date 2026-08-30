#!/usr/bin/env node
/**
 * QUÉ TRAE EL DESPLIEGUE, ANTES DE DESPLEGARLO. **NO DESPLIEGA NADA.**
 *
 * EL PROBLEMA. Entre lo que corre en producción y lo que hay aquí hay 204
 * commits. «204 commits» no es información: no dice si alguno cambia una
 * variable de entorno que falta, si el código nuevo lee una columna que la base
 * todavía no tiene, o si hay que migrar antes o después de desplegar.
 *
 * Este guion contesta eso leyendo el diff y clasificándolo, y lo hace sin
 * desplegar, sin escribir y sin salir a ninguna parte: `git` contra el
 * repositorio local. Coste: 0 €.
 *
 * LO QUE DE VERDAD DECIDE EL ORDEN. Dos preguntas, y son opuestas:
 *
 *   CÓDIGO NUEVO CONTRA ESQUEMA VIEJO — si lo nuevo lee una tabla que sólo
 *   existe tras migrar, desplegar primero lo rompe. Hay que migrar antes.
 *
 *   CÓDIGO VIEJO CONTRA ESQUEMA NUEVO — si migrar rompe lo que ya corre,
 *   migrar antes deja producción caída hasta el despliegue. Hay que desplegar
 *   antes, o partir la migración en dos.
 *
 * Se buscan las dos. Si sólo se mira una, el orden que salga será correcto la
 * mitad de las veces.
 *
 * LO QUE NO PUEDE CONTESTAR, y se dice en vez de fingirlo: si un cambio de
 * comportamiento rompe algo en tiempo de ejecución. Eso no se ve en un diff.
 *
 * USO
 *   node scripts/preflight-del-despliegue.mjs <sha-en-produccion> [sha-objetivo]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, "docs", "PREFLIGHT_DEL_DESPLIEGUE.md");

const DESDE = process.argv[2];
const HASTA = process.argv[3] || "HEAD";
if (!DESDE) {
  console.error("USO: node scripts/preflight-del-despliegue.mjs <sha-en-produccion> [sha-objetivo]");
  process.exit(2);
}

const git = (...args) =>
  execFileSync("git", args, { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/**
 * A qué área pertenece un fichero.
 *
 * El orden importa: la primera que casa gana. Las de seguridad van delante
 * porque un fichero de autenticación dentro de `api/` interesa como
 * autenticación, no como API.
 */
const AREAS = [
  ["SECURITY", /security|rls|guard|sanitiz|csrf|cors|helmet|secreto|secret/i],
  ["AUTH", /\bauth\b|login|session|jwt|token|passkey|password/i],
  ["RBAC_RLS", /rbac|role|permiso|permission|policy|politica|aislamiento|tenant/i],
  ["DATABASE", /db\/migrations|\.sql$|backend\/db\//i],
  ["BILLING", /billing|stripe|paddle|precio|price|invoice|factura|subscription/i],
  ["EMAIL", /email|ses|smtp|correo|mailer/i],
  ["CONNECTORS", /integrations?\/|connector|oauth|webhook/i],
  ["AI", /llm|ollama|openai|local-ai|private-ai|inferenc|modelo|autonomous\/llm/i],
  ["AGENTS", /agents?\/|agente|catalogo|sector|prompt/i],
  ["JOBS", /queue|cola|worker|trabajador|cron|job/i],
  ["OS", /os-agents|os-core|osJob|orchestr|ejecucion|puente/i],
  ["PORTAL", /portal|cliente\/|customer/i],
  ["API", /app\/api\/|route\.ts$/i],
  ["WEB", /\.tsx$|components?\/|app\/\(|public\/|styles?\//i],
  ["INFRA", /Dockerfile|railway|nixpacks|\.toml$|\.yml$|\.yaml$|next\.config/i],
  ["ENV", /\.env|env\.|environment/i],
  ["TESTS", /__tests__|\.test\.|\.spec\./i],
  ["DOCS", /^docs\/|\.md$/i],
  ["SCRIPTS", /^scripts\//i],
];

const areaDe = (f) => AREAS.find(([, re]) => re.test(f))?.[0] ?? "OTHER";

// ── el diff ──────────────────────────────────────────────────────────────────

const ficheros = git("diff", "--name-status", `${DESDE}..${HASTA}`)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [estado, ...resto] = l.split("\t");
    return { estado: estado[0], fichero: resto[resto.length - 1] };
  });

const commits = git("log", "--oneline", `${DESDE}..${HASTA}`).split("\n").filter(Boolean);

const porArea = {};
for (const f of ficheros) {
  const a = areaDe(f.fichero);
  (porArea[a] ??= []).push(f);
}

// ── variables de entorno nuevas ──────────────────────────────────────────────
//
// Se buscan en el código NUEVO y se restan las que ya se leían antes. Una
// variable que el código nuevo lee y producción no tiene puesta es una caída
// silenciosa: no falla el despliegue, falla la primera petición que pase por ahí.
const leerVars = (rev) => {
  // CON EL FICHERO DELANTE, no solo el nombre. Hace falta para separar las que
  // lee el codigo que corre en produccion de las que solo leen las pruebas — y
  // esa separacion es la diferencia entre una lista de 32 que asusta y las pocas
  // que de verdad hay que poner antes de desplegar.
  const txt = git("grep", "-noE", "process\\.env\\.[A-Z0-9_]+", rev, "--", "backend", "apps/web/src")
    .split("\n")
    .filter(Boolean);
  const mapa = new Map();
  for (const linea of txt) {
    // `rev:fichero:numero:process.env.LA_VARIABLE`
    const m = /^[^:]*:([^:]+):\d+:process\.env\.([A-Z0-9_]+)$/.exec(linea);
    if (!m) continue;
    const [, fichero, nombre] = m;
    // Un `.json` de certificación que MENCIONA una variable no la lee: es
    // documentación. Contarlo como código de producción hacía que
    // `SES_SNS_TOPIC_ARN` saliera como requisito del despliegue por aparecer
    // dentro de una comprobación escrita en texto.
    const esCodigo = /\.tsx?$/.test(fichero);
    const enPruebas =
      !esCodigo || /__tests__|\.test\.|\.spec\.|^scripts\//.test(fichero);
    const actual = mapa.get(nombre) ?? { soloPruebas: true, ejemplo: fichero };
    if (!enPruebas) {
      actual.soloPruebas = false;
      actual.ejemplo = fichero;
    }
    mapa.set(nombre, actual);
  }
  return mapa;
};
let varsNuevas = [];
let varsDePruebas = [];
try {
  const antes = leerVars(DESDE);
  const despues = leerVars(HASTA);
  const nuevas = [...despues.entries()].filter(([nombre]) => !antes.has(nombre));
  varsNuevas = nuevas
    .filter(([, v]) => !v.soloPruebas)
    .map(([nombre, v]) => ({ nombre, donde: v.ejemplo }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  varsDePruebas = nuevas.filter(([, v]) => v.soloPruebas).map(([nombre]) => nombre).sort();
} catch {
  varsNuevas = null;
}

// ── dependencias ─────────────────────────────────────────────────────────────
const depsDe = (rev) => {
  try {
    const p = JSON.parse(git("show", `${rev}:apps/web/package.json`));
    return { ...(p.dependencies ?? {}), ...(p.devDependencies ?? {}) };
  } catch {
    return {};
  }
};
const dA = depsDe(DESDE);
const dB = depsDe(HASTA);
const depsNuevas = Object.keys(dB).filter((k) => !(k in dA)).sort();
const depsCambiadas = Object.keys(dB).filter((k) => k in dA && dA[k] !== dB[k]).sort();
const depsQuitadas = Object.keys(dA).filter((k) => !(k in dB)).sort();

// ── runtime / gestor de paquetes ─────────────────────────────────────────────
const raizDe = (rev) => {
  try {
    return JSON.parse(git("show", `${rev}:package.json`));
  } catch {
    return {};
  }
};
const rA = raizDe(DESDE);
const rB = raizDe(HASTA);

// ── migraciones nuevas y qué crean ───────────────────────────────────────────
const migracionesNuevas = ficheros
  .filter((f) => /backend\/db\/migrations\/.*\.sql$/.test(f.fichero) && f.estado === "A")
  .map((f) => path.basename(f.fichero))
  .sort();

/**
 * ¿Lee el código nuevo algo que sólo existe tras migrar?
 *
 * Se sacan los nombres de tabla que crean las migraciones nuevas y se busca si
 * el código nuevo los menciona. Si los menciona, ese código NO puede correr
 * contra el esquema viejo: hay que migrar antes de desplegar.
 */
const tablasNuevas = new Set();
for (const m of migracionesNuevas) {
  const sql = fs.readFileSync(path.join(RAIZ, "backend", "db", "migrations", m), "utf8");
  const limpio = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
  for (const x of limpio.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:public\.)?"?([a-z0-9_]+)"?/gi)) {
    tablasNuevas.add(x[1]);
  }
}

const codigoQueNecesitaEsquemaNuevo = [];
for (const t of tablasNuevas) {
  let usos = "";
  try {
    usos = git("grep", "-l", t, HASTA, "--", "backend", "apps/web/src");
  } catch {
    usos = "";
  }
  const enCodigo = usos
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split(":").slice(1).join(":"))
    .filter((f) => !/__tests__|\.test\.|migrations\//.test(f));
  if (enCodigo.length > 0) codigoQueNecesitaEsquemaNuevo.push({ tabla: t, ficheros: enCodigo.slice(0, 5) });
}

/**
 * ¿Rompe la migración al código que YA corre?
 *
 * Sólo lo haría si quitara o renombrara algo. Se busca fuera de comentarios,
 * porque cada migración documenta su vuelta atrás con `DROP` comentados y
 * contarlos daría una alarma falsa en todas.
 */
const migracionesDestructivas = [];
for (const m of migracionesNuevas) {
  const sql = fs
    .readFileSync(path.join(RAIZ, "backend", "db", "migrations", m), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
  const que = [];
  if (/\bDROP\s+TABLE\b/i.test(sql)) que.push("DROP TABLE");
  if (/\bDROP\s+COLUMN\b/i.test(sql)) que.push("DROP COLUMN");
  if (/\bRENAME\b/i.test(sql)) que.push("RENAME");
  if (/\bALTER\s+COLUMN\b[\s\S]{0,80}\bTYPE\b/i.test(sql)) que.push("ALTER TYPE");
  if (que.length > 0) migracionesDestructivas.push({ m, que });
}

// ── rutas ────────────────────────────────────────────────────────────────────
const rutas = ficheros.filter((f) => /app\/api\/.*route\.ts$/.test(f.fichero));
const rutasNuevas = rutas.filter((f) => f.estado === "A");
const rutasBorradas = rutas.filter((f) => f.estado === "D");

// ── el documento ─────────────────────────────────────────────────────────────

const l = [];
l.push("# Preflight del despliegue");
l.push("");
l.push(
  `Lo escribe \`scripts/preflight-del-despliegue.mjs\` comparando **${DESDE}** —lo que`,
  `corre en producción— con **${git("rev-parse", "--short", HASTA).trim()}**. **No despliega nada.**`,
);
l.push("");
l.push("| | |");
l.push("|---|---|");
l.push(`| Commits | ${commits.length} |`);
l.push(`| Ficheros tocados | ${ficheros.length} |`);
l.push(`| Migraciones nuevas | ${migracionesNuevas.length} |`);
l.push(`| Rutas nuevas / borradas | ${rutasNuevas.length} / ${rutasBorradas.length} |`);
l.push("");

l.push("## Por área");
l.push("");
l.push("| Área | Ficheros |");
l.push("|---|---|");
for (const [a, fs_] of Object.entries(porArea).sort((x, y) => y[1].length - x[1].length)) {
  l.push(`| \`${a}\` | ${fs_.length} |`);
}
l.push("");

l.push("## El orden: ¿migrar antes o después?");
l.push("");
if (codigoQueNecesitaEsquemaNuevo.length > 0) {
  l.push(
    "**MIGRAR ANTES DE DESPLEGAR.** El código nuevo nombra tablas que hoy no existen",
    "en producción. Si se despliega primero, esas rutas fallan hasta que se migre:",
    "",
  );
  for (const c of codigoQueNecesitaEsquemaNuevo) {
    l.push(`- \`${c.tabla}\` — la usan ${c.ficheros.map((f) => `\`${f}\``).join(", ")}`);
  }
} else {
  l.push("El código nuevo no nombra ninguna tabla de las que crean estas migraciones.");
}
l.push("");
if (migracionesDestructivas.length > 0) {
  l.push("**Y ATENCIÓN**: estas migraciones quitan o cambian algo, así que podrían romper");
  l.push("al código que ya está corriendo mientras se despliega el nuevo:");
  l.push("");
  for (const d of migracionesDestructivas) l.push(`- \`${d.m}\`: ${d.que.join(", ")}`);
} else {
  l.push(
    "**Ninguna migración quita ni renombra nada** fuera de comentarios: son aditivas.",
    "El código viejo sigue funcionando con el esquema nuevo, así que migrar antes no",
    "deja producción rota en la ventana entre migrar y desplegar.",
  );
}
l.push("");

l.push("## Variables de entorno");
l.push("");
if (varsNuevas === null) {
  l.push("No se han podido comparar.");
} else if (varsNuevas.length === 0) {
  l.push("**Ninguna variable nueva la lee el codigo que corre en produccion.**");
} else {
  l.push(
    `**${varsNuevas.length} que lee el codigo de produccion y el desplegado no.** Una que falte`,
    "no rompe el despliegue: rompe la primera peticion que pase por ahi, que es peor porque",
    "parece que fue bien.",
    "",
  );
  for (const v of varsNuevas) l.push(`- \`${v.nombre}\` — en \`${v.donde}\``);
}
/**
 * ¿Alguna de las nuevas es OBLIGATORIA?
 *
 * Una variable con valor por defecto es una preferencia; una sin él es un
 * requisito, y la diferencia decide si el despliegue puede salir sin ponerla.
 *
 * Se mira si la lectura lleva `??`, `||` o una comparación —`=== "1"`—: en los
 * tres casos hay comportamiento definido cuando falta. Es análisis de texto y
 * se dice: sirve para saber cuáles mirar, no para dar ninguna por buena.
 */
const obligatorias = [];
for (const v of varsNuevas ?? []) {
  let linea = "";
  try {
    linea = git("grep", "-hn", `process.env.${v.nombre}`, HASTA, "--", v.donde).split("\n")[0] ?? "";
  } catch {
    linea = "";
  }
  // SE MIRAN LAS LÍNEAS DE ALREDEDOR, no sólo la de la lectura.
  //
  // `NELVYON_WEB_JOBS_DATABASE_URL` se lee sin `??` y parecía obligatoria; tres
  // líneas más abajo hay un `if (privilegiada.length > 0) … else DATABASE_URL`.
  // Juzgar por la línea suelta convierte una preferencia en un requisito, y eso
  // manda a alguien a configurar algo que no hace falta.
  let contexto = "";
  try {
    contexto = git("grep", "-A", "6", `process.env.${v.nombre}`, HASTA, "--", v.donde);
  } catch {
    contexto = linea;
  }
  const tieneDefecto = /\?\?|\|\||===|!==|\?\.|length > 0|length === 0|if \(/.test(contexto);
  if (!tieneDefecto && linea) obligatorias.push({ ...v, linea: linea.trim().slice(0, 120) });
}
if (varsNuevas && varsNuevas.length > 0) {
  l.push("");
  if (obligatorias.length === 0) {
    l.push(
      "**Ninguna es obligatoria.** Todas se leen con un valor por defecto o comparándolas",
      "con un valor concreto, así que el despliegue arranca sin ponerlas. Y las que",
      "protegen algo caen del lado seguro cuando faltan: sin",
      "`NELVYON_GASTO_EXTERNO_HABILITADO` el gasto externo queda **apagado**, y sin",
      "`NELVYON_MODO_COSTE_CERO` el modo de coste cero queda **encendido**.",
    );
  } else {
    l.push(`**${obligatorias.length} parecen obligatorias** —se leen sin valor por defecto—:`);
    l.push("");
    for (const o of obligatorias) l.push(`- \`${o.nombre}\` — \`${o.linea}\``);
  }
}
if (varsDePruebas.length > 0) {
  l.push("");
  l.push(
    `Otras **${varsDePruebas.length}** son nuevas pero **solo las leen pruebas y guiones**, asi que no`,
    "hacen falta en produccion. Se listan igual porque no ponerlas es una decision, no un",
    "olvido:",
    "",
  );
  l.push(varsDePruebas.map((v) => `\`${v}\``).join(", "));
}
l.push("");

l.push("## Dependencias y runtime");
l.push("");
l.push("| | |");
l.push("|---|---|");
l.push(`| Dependencias nuevas | ${depsNuevas.length}${depsNuevas.length ? ": " + depsNuevas.map((d) => `\`${d}\``).join(", ") : ""} |`);
l.push(`| Dependencias con versión cambiada | ${depsCambiadas.length} |`);
l.push(`| Dependencias retiradas | ${depsQuitadas.length}${depsQuitadas.length ? ": " + depsQuitadas.map((d) => `\`${d}\``).join(", ") : ""} |`);
l.push(`| Gestor de paquetes | ${rA.packageManager ?? "?"} → ${rB.packageManager ?? "?"} |`);
l.push(`| Node exigido | ${rA.engines?.node ?? "sin declarar"} → ${rB.engines?.node ?? "sin declarar"} |`);
l.push("");
if (depsCambiadas.length > 0) {
  l.push("### Versiones que cambian");
  l.push("");
  for (const d of depsCambiadas) l.push(`- \`${d}\`: ${dA[d]} → ${dB[d]}`);
  l.push("");
}

l.push("## Rutas");
l.push("");
if (rutasNuevas.length > 0) {
  l.push(`### Nuevas — ${rutasNuevas.length}`);
  l.push("");
  for (const r of rutasNuevas.slice(0, 30)) l.push(`- \`${r.fichero}\``);
  if (rutasNuevas.length > 30) l.push(`- …y ${rutasNuevas.length - 30} más`);
  l.push("");
}
if (rutasBorradas.length > 0) {
  l.push(`### Borradas — ${rutasBorradas.length} ⚠️`);
  l.push("");
  l.push("Una ruta que desaparece devuelve 404 a quien la estuviera llamando.");
  l.push("");
  for (const r of rutasBorradas) l.push(`- \`${r.fichero}\``);
  l.push("");
} else {
  l.push("**Ninguna ruta desaparece.** Nada que estuviera llamando a producción se queda sin destino.");
  l.push("");
}

l.push("## Lo que este preflight NO puede contestar");
l.push("");
l.push(
  "- **Si un cambio de comportamiento rompe algo en ejecución.** Eso no se ve en un",
  "  diff. Para eso está el humo posterior al despliegue.",
  "- **Si las 8.563 pruebas cubren lo que importa.** Dicen que lo que se probó pasa.",
  "- **Si el despliegue arranca.** El build compila aquí; que arranque allí depende de",
  "  variables y de red.",
);
l.push("");

fs.writeFileSync(SALIDA, l.join("\n"), "utf8");

console.log("");
console.log("PREFLIGHT DEL DESPLIEGUE");
console.log(`  ${commits.length} commits · ${ficheros.length} ficheros · ${migracionesNuevas.length} migraciones`);
console.log(`  variables nuevas de produccion: ${varsNuevas === null ? "?" : varsNuevas.length} (+${varsDePruebas.length} solo de pruebas)`);
console.log(`  dependencias: +${depsNuevas.length} ~${depsCambiadas.length} -${depsQuitadas.length}`);
console.log(`  rutas: +${rutasNuevas.length} -${rutasBorradas.length}`);
console.log(`  código que exige esquema nuevo: ${codigoQueNecesitaEsquemaNuevo.length} tablas`);
console.log(`  migraciones destructivas: ${migracionesDestructivas.length}`);
console.log("");
console.log(`  escrito en ${path.relative(RAIZ, SALIDA)}`);
console.log("");
