#!/usr/bin/env node
/**
 * ¿RESPONDEN TODOS LOS DOMINIOS QUE EL CÓDIGO DA POR BUENOS? **SOLO LECTURA.**
 *
 * POR QUÉ EXISTE. `www.nelvyon.com` devolvía 404 y nadie se había enterado. El
 * dominio está en `DEFAULT_HOSTS` de `resolveWhitelabel.ts` —o sea: el código
 * lo trata como un host propio de NELVYON— y estaba muerto.
 *
 * Nadie lo vio porque no había forma de verlo. La salud mira UN dominio; el
 * humo mira UN dominio. Un dominio que el código considera suyo y que no
 * responde no aparecía en ninguna comprobación.
 *
 * LO QUE MIDE, y por qué cada cosa:
 *
 *   · EL DENOMINADOR SALE DEL CÓDIGO. La lista de hosts se lee de
 *     `resolveWhitelabel.ts`, no se escribe aquí. Una lista a mano se queda
 *     corta el día que alguien añade un dominio, que es justo el día en que
 *     haría falta.
 *
 *   · `x-railway-fallback: true` ES LA FIRMA. Railway la pone cuando la
 *     petición le llega pero el `Host` no corresponde a ningún dominio suyo.
 *     Distingue «el dominio no está dado de alta» de «la aplicación falla», que
 *     son dos problemas distintos con dos arreglos distintos y un mismo 404.
 *
 *   · UN 3xx HACIA EL CANÓNICO ES UN APROBADO. Redirigir `www` al ápice es la
 *     solución correcta, no un fallo. Lo que no vale es el 404.
 *
 * LO QUE NO HACE: no cambia DNS, no da de alta dominios y no toca Railway. Sólo
 * pide páginas por HTTP y mira lo que vuelve.
 *
 * COSTE: 0 €. Peticiones HTTP a dominios propios.
 *
 * USO
 *   node scripts/responden-los-dominios.mjs
 *   node scripts/responden-los-dominios.mjs --json
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const FUENTE = path.join(RAIZ, "apps", "web", "src", "core", "whitelabel", "resolveWhitelabel.ts");

/** El canónico que el propio sitio declara. Se comprueba, no se supone. */
const CANONICO = "nelvyon.com";

/**
 * Los hosts que el código considera propios, leídos del código.
 *
 * Se descartan los de desarrollo: `localhost` y `127.0.0.1` no tienen que
 * responder en internet, y señalarlos sería ruido.
 */
export function hostsDeclarados(fuente = FUENTE) {
  const texto = fs.readFileSync(fuente, "utf8").replace(/\r\n/g, "\n");
  const bloque = /const DEFAULT_HOSTS = new Set\(\[([\s\S]*?)\]\)/.exec(texto);
  if (!bloque) throw new Error("no se encuentra DEFAULT_HOSTS en resolveWhitelabel.ts");
  return [...bloque[1].matchAll(/"([^"]+)"/g)]
    .map((m) => m[1])
    .filter((h) => h !== "localhost" && h !== "127.0.0.1");
}

async function sondear(host) {
  const url = `https://${host}/`;
  try {
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
    const destino = r.headers.get("location");
    return {
      host,
      code: r.status,
      fallbackDeRailway: r.headers.get("x-railway-fallback") === "true",
      redirigeA: destino,
      servidor: r.headers.get("server") ?? null,
    };
  } catch (e) {
    return { host, code: 0, error: String(e.message).slice(0, 80) };
  }
}

/**
 * El veredicto de un host.
 *
 * Sirve: responde 2xx, o redirige al canónico. No sirve: cualquier otra cosa.
 */
export function veredicto(r, canonico = CANONICO) {
  if (r.code >= 200 && r.code < 300) return { estado: "SIRVE", porQue: `responde ${r.code}` };
  if (r.code >= 300 && r.code < 400) {
    const va = r.redirigeA ?? "";
    if (va.includes(canonico)) return { estado: "REDIRIGE_AL_CANONICO", porQue: `${r.code} -> ${va}` };
    return { estado: "REDIRIGE_A_OTRO_SITIO", porQue: `${r.code} -> ${va || "(sin Location)"}` };
  }
  if (r.fallbackDeRailway) {
    return {
      estado: "NO_DADO_DE_ALTA_EN_RAILWAY",
      porQue: `${r.code} con x-railway-fallback: la peticion llega a Railway pero el Host no es suyo`,
    };
  }
  if (r.code === 0) return { estado: "NO_RESPONDE", porQue: r.error ?? "sin respuesta" };
  return { estado: "ROTO", porQue: `responde ${r.code}` };
}

const ACEPTABLES = new Set(["SIRVE", "REDIRIGE_AL_CANONICO"]);

async function main() {
  const comoJson = process.argv.includes("--json");
  const hosts = hostsDeclarados();
  const filas = [];
  for (const h of hosts) {
    const r = await sondear(h);
    filas.push({ ...r, ...veredicto(r) });
  }
  const malos = filas.filter((f) => !ACEPTABLES.has(f.estado));

  if (comoJson) {
    console.log(JSON.stringify({ canonico: CANONICO, denominador: hosts.length, filas }, null, 2));
    process.exit(malos.length ? 2 : 0);
  }

  console.log("DOMINIOS QUE EL CODIGO DA POR PROPIOS\n");
  console.log(`  canonico declarado por el sitio: ${CANONICO}`);
  console.log(`  hosts leidos de resolveWhitelabel.ts: ${hosts.length}\n`);
  if (hosts.length === 0) {
    // Cero hosts no es un aprobado: es que no se ha mirado nada.
    console.log("  NO SE HA LEIDO NINGUN HOST. Eso no es un PASS.");
    process.exit(3);
  }
  for (const f of filas) {
    const marca = ACEPTABLES.has(f.estado) ? "ok " : "<<<";
    console.log(`  ${marca} ${f.host.padEnd(22)} ${f.estado.padEnd(28)} ${f.porQue}`);
  }
  console.log("");
  console.log(
    malos.length === 0
      ? "TODOS LOS DOMINIOS PROPIOS SIRVEN O REDIRIGEN AL CANONICO."
      : `${malos.length} DOMINIO(S) QUE EL CODIGO CREE SUYOS NO RESPONDEN.`,
  );
  process.exit(malos.length ? 2 : 0);
}

const invocadoDirectamente =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invocadoDirectamente) main();
