#!/usr/bin/env node
/**
 * HUMO SOBRE EL BUILD DE PRODUCCIÓN, CON UN INQUILINO RECIÉN CREADO.
 *
 * Esta es la prueba que faltaba, y la que habría evitado el defecto más caro
 * del árbol. Siete rutas de `/api/saas` devolvían 500 a cualquier cliente nuevo
 * porque veintinueve servicios pedían la conexión con
 * `require("../db/DbClient")`, y en el bundle de servidor de Next esa
 * desestructuración da `undefined`. Vitest ejecuta SIN empaquetar, así que las
 * doce mil pruebas del repositorio pasaban en verde sobre el mismo código.
 *
 * Lo que hace, en este orden:
 *
 *   1. Levanta `apps/web/server.js` sobre el `.next` YA COMPILADO. No compila
 *      nada: si el build no está hecho, se niega a seguir en vez de medir otra
 *      cosa.
 *   2. Da de alta un usuario nuevo y completa su onboarding, de modo que el
 *      inquilino sea de verdad nuevo. Es la condición en la que fallaban las
 *      siete: con datos ya sembrados, varias respondían 200.
 *   3. Recorre TODAS las rutas GET de `/api/saas` derivadas del árbol —el
 *      denominador sale del sistema de ficheros, nunca de una lista escrita a
 *      mano— y falla si alguna devuelve 5xx.
 *
 * Un 401, un 403 o un 404 NO son fallo: son respuestas del contrato. Lo que se
 * persigue es el 500, que siempre es una avería.
 *
 * REQUISITOS, todos locales y sin coste:
 *   - PostgreSQL con el esquema aplicado (DATABASE_URL).
 *   - `scripts/upstash-local-para-pruebas.mjs` levantado, porque el limitador
 *     falla cerrado en producción sin almacén compartido, y `NODE_ENV` va
 *     compilado dentro del bundle: `RATE_LIMIT_DISABLED` es inerte aquí.
 *
 * USO
 *   DATABASE_URL=... node scripts/humo-sobre-build-de-produccion.mjs
 *
 * SALIDA
 *   0  ninguna ruta devuelve 5xx
 *   1  falta algo para poder medir (build, base de datos, alta)
 *   2  alguna ruta devuelve 5xx
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.join(ROOT, "apps", "web");
const PUERTO = Number(process.env.HUMO_PORT || 3998);
const PUERTO_UPSTASH = Number(process.env.UPSTASH_FAKE_PORT || 8079);
const BASE = `http://127.0.0.1:${PUERTO}`;

function abortar(codigo, mensaje) {
  console.error(`\n${mensaje}`);
  process.exit(codigo);
}

/** Rutas GET de /api/saas, derivadas del árbol. El denominador no se escribe. */
function rutasDeSaas() {
  const raiz = path.join(WEB, "src", "app", "api", "saas");
  const salida = [];
  const andar = (dir, prefijo) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "__tests__") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        andar(p, `${prefijo}/${e.name}`);
        continue;
      }
      if (e.name !== "route.ts" && e.name !== "route.tsx") continue;
      const texto = fs.readFileSync(p, "utf8");
      // Sólo GET: un POST necesitaría un cuerpo válido por ruta, y esta prueba
      // busca averías de arranque, no de validación.
      if (!/export\s+async\s+function\s+GET\b/.test(texto)) continue;
      // Los segmentos dinámicos exigirían un id real de cada dominio.
      if (prefijo.includes("[")) continue;
      salida.push(`/api/saas${prefijo}`);
    }
  };
  andar(raiz, "");
  return salida.sort();
}

async function esperar(url, intentos = 90) {
  for (let i = 0; i < intentos; i += 1) {
    try {
      await fetch(url);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function json(url, opciones) {
  const res = await fetch(url, opciones);
  let cuerpo = null;
  try {
    cuerpo = await res.json();
  } catch {
    /* algunas respuestas no son JSON */
  }
  return { status: res.status, cuerpo };
}

// ── Comprobaciones previas ──────────────────────────────────────────────────

const buildId = path.join(WEB, ".next", "BUILD_ID");
if (!fs.existsSync(buildId)) {
  abortar(1, "No hay build. Ejecuta `pnpm -C apps/web build` primero.\nEsta prueba mide el artefacto compilado; sin él no mide nada.");
}

if (!process.env.DATABASE_URL?.trim()) {
  abortar(1, "Falta DATABASE_URL. Apunta a un PostgreSQL LOCAL con el esquema aplicado.");
}

try {
  await fetch(`http://127.0.0.1:${PUERTO_UPSTASH}/pipeline`, {
    method: "POST",
    body: JSON.stringify([["INCR", "humo:ping"]]),
  });
} catch {
  abortar(
    1,
    `No responde el doble de Upstash en 127.0.0.1:${PUERTO_UPSTASH}.\n` +
      "Levántalo con: node scripts/upstash-local-para-pruebas.mjs &\n" +
      "Hace falta porque el limitador falla cerrado en producción sin almacén\n" +
      "compartido, y NODE_ENV va compilado dentro del bundle.",
  );
}

const edadBuild = Date.now() - fs.statSync(buildId).mtimeMs;
console.log(`Build de hace ${Math.round(edadBuild / 60000)} min · ${rutasDeSaas().length} rutas GET derivadas del árbol\n`);

// ── Servidor ────────────────────────────────────────────────────────────────

const servidor = spawn(process.execPath, ["server.js"], {
  cwd: WEB,
  env: {
    ...process.env,
    PORT: String(PUERTO),
    NODE_ENV: "production",
    UPSTASH_REDIS_REST_URL: `http://127.0.0.1:${PUERTO_UPSTASH}`,
    UPSTASH_REDIS_REST_TOKEN: "local",
    NEXT_PUBLIC_APP_URL: BASE,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

const registro = [];
servidor.stdout.on("data", (d) => registro.push(String(d)));
servidor.stderr.on("data", (d) => registro.push(String(d)));

const cerrar = () => {
  try {
    servidor.kill();
  } catch {
    /* ya estaba muerto */
  }
};
process.on("exit", cerrar);

if (!(await esperar(`${BASE}/api/auth/me`))) {
  console.error(registro.join("").slice(-2000));
  cerrar();
  abortar(1, "El servidor no llegó a responder.");
}

// ── Un inquilino de verdad nuevo ────────────────────────────────────────────

const sello = Date.now();
const correo = `humo.${sello}@ejemplo.test`;
const clave = `Humo-Local-${sello}!aA1`;

const alta = await json(`${BASE}/api/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: correo, password: clave, name: "Humo Local" }),
});
if (alta.status !== 200 && alta.status !== 201) {
  cerrar();
  abortar(1, `El alta devolvió ${alta.status}: ${JSON.stringify(alta.cuerpo)}`);
}
const token = alta.cuerpo?.token;
if (!token) {
  cerrar();
  abortar(1, "El alta no devolvió token.");
}

const cabeceras = {
  Authorization: `Bearer ${token}`,
  Cookie: `nelvyon_token=${token}`,
  "Content-Type": "application/json",
};

// Sin inquilino SaaS, todo /api/saas responde 404 «Tenant not found» y la
// prueba pasaría sin haber tocado ninguna de las rutas. Eso es un verde falso.
const onboarding = await json(`${BASE}/api/saas/onboarding`, {
  method: "POST",
  headers: cabeceras,
  body: JSON.stringify({
    companyName: `Humo ${sello}`,
    industry: "servicios",
    website: "https://ejemplo.test",
    employees: "1-10",
    goals: ["mas_clientes"],
  }),
});
if (onboarding.status !== 200) {
  cerrar();
  abortar(1, `El onboarding devolvió ${onboarding.status}: ${JSON.stringify(onboarding.cuerpo)}`);
}

// ── El recorrido ────────────────────────────────────────────────────────────

const rutas = rutasDeSaas();
const averias = [];
const porCodigo = new Map();

for (const ruta of rutas) {
  let status;
  try {
    const res = await fetch(`${BASE}${ruta}`, { headers: cabeceras });
    status = res.status;
  } catch (err) {
    status = 0;
    averias.push({ ruta, status, detalle: String(err) });
    continue;
  }
  porCodigo.set(status, (porCodigo.get(status) ?? 0) + 1);
  if (status >= 500) averias.push({ ruta, status });
}

cerrar();

console.log("Códigos:");
for (const [codigo, n] of [...porCodigo].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${codigo}  ×${n}`);
}

if (averias.length === 0) {
  console.log(`\nOK · ${rutas.length} rutas recorridas con un inquilino nuevo, ninguna 5xx.`);
  process.exit(0);
}

console.error(`\n${averias.length} ruta(s) con 5xx sobre el build de producción:`);
for (const a of averias) console.error(`  ${a.status}  ${a.ruta}`);

// Las líneas del registro que explican por qué, que es lo que hace falta para
// arreglarlo sin volver a reproducirlo a mano.
const causas = registro
  .join("")
  .split("\n")
  .filter((l) => /TypeError|Error:|saasErrorBody|does not exist/.test(l))
  .slice(-15);
if (causas.length) {
  console.error("\nDel registro del servidor:");
  for (const l of causas) console.error(`  ${l.trim().slice(0, 200)}`);
}

process.exit(2);
