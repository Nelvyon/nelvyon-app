#!/usr/bin/env node
/**
 * ¿QUÉ RECHAZOS DE SEGURIDAD SE DESCARTAN SIN DEJAR RASTRO? **SOLO LECTURA.**
 *
 * DE DÓNDE SALE. `agentRunHook.ts` tenía un `catch` vacío con el comentario
 * «CRM opcional». Metía en el mismo saco dos cosas que no se parecen: que el
 * CRM no esté disponible —tolerable— y que la comprobación de propiedad haya
 * dicho que NO. Lo segundo estaba bien impedido, pero se descartaba sin dejar
 * rastro en ninguna parte, y desde 189 sitios de llamada.
 *
 * La pregunta que contesta esta herramienta es si eso pasa en más sitios.
 *
 * LO QUE **NO** BUSCA, y es la mitad del diseño. Un `catch` vacío no es un
 * defecto: la mayoría son correctos —un `JSON.parse` de algo opcional, un
 * cierre de conexión que ya estaba cerrado, un `rmSync` de un fichero que no
 * existe—. Señalarlos todos daría cientos de avisos legítimos y la herramienta
 * duraría un día.
 *
 * LO QUE SÍ BUSCA: la INTERSECCIÓN. Un `catch` que se calla **alrededor de
 * código que decide sobre permisos**. Eso es lo que convierte un «no» en un
 * silencio, y un silencio en un resultado plausible.
 *
 * CÓMO DECIDE QUE ALGO ES DE AUTORIZACIÓN. Por vocabulario: `assert…Owner`,
 * `can(`, `authorize`, `forbidden`, `denied`, `permission`, `tenant`,
 * `workspace`, `rls`, `rbac`, `requireApproval`… Es una heurística y se dice:
 * puede señalar algo que sólo se llama parecido, y se le puede escapar una
 * comprobación con un nombre que no está en la lista.
 *
 * LO QUE NO HACE: no distingue si el `catch` es correcto. Un rechazo puede
 * ignorarse a propósito, y a veces debe. Lo que no puede es ignorarse SIN QUE
 * SE VEA. Esto enseña dónde mirar; decidir es leer el sitio.
 *
 * COSTE: 0 €. Lee ficheros.
 *
 * USO
 *   node scripts/rechazos-que-se-tragan.mjs
 *   node scripts/rechazos-que-se-tragan.mjs --json
 *   node scripts/rechazos-que-se-tragan.mjs --todos    (tambien los no sensibles)
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();

/**
 * El autor ya dijo que la excepcion se esperaba.
 *
 * `catch { /* expected *\/ }` despues de llamar a algo que DEBE lanzar es el
 * idioma correcto de una autoprueba, no un descuido. La primera version de esta
 * herramienta senalo `MobileSecureSession.ts`, que hace exactamente eso —llama a
 * `assertMobileTenantIsolation` con otro inquilino esperando que reviente— y
 * senalar lo correcto es como se consigue que se deje de mirar la herramienta.
 */
const INTENCION_DECLARADA = /\b(expected|esperad[oa]|a prop[oó]sito|deliberad[oa]|se espera|debe lanzar|should throw|ignora[dr]?[oa]? a prop)/i;

/**
 * Una LLAMADA de autorizacion, no una simple mencion.
 *
 * Que en el bloque aparezca la palabra `tenantId` solo dice que hay un
 * identificador en juego. Que se invoque `assertContactOwner(...)` dice que ahi
 * se esta decidiendo un permiso. La diferencia separa 99 avisos de los pocos
 * que hay que leer.
 */
const LLAMADA_DE_AUTORIZACION =
  /\b(assert[A-Z]\w*|ensure(Owner|Access|Tenant|Workspace)\w*|authoriz\w*|autoriz(ar|acion)\w*|checkAccess|hasAccess|isAllowed|puedeAcceder|require(Approval|Auth|Role|Permission|Workspace|Tenant|Os\w*)|can[A-Z]\w*)\s*\(/;

/** Vocabulario que delata una decisión sobre permisos. */
const AUTORIZACION =
  /\b(assert[A-Z]\w*|can[A-Z]\w*|authoriz\w*|autoriz\w*|forbidden|denied|deneg\w*|permission\w*|permiso\w*|rbac|rls|require(Approval|Auth|Role|Permission|Workspace|Tenant|Os\w*)|ensure(Owner|Access|Tenant|Workspace)\w*|checkAccess|hasAccess|isAllowed|puedeAcceder|tenantId|workspaceId|owner)\b/;

/**
 * Lo que cuenta como «se lo traga».
 *
 * Un `catch` que registra, relanza o devuelve algo distinto de vacío NO entra:
 * ahí alguien decidió qué hacer.
 */
const SILENCIOSO_LLAVES = /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*\}/g;
const SILENCIOSO_PROMESA =
  /\.catch\s*\(\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)?\s*=>\s*(?:\{\s*(?:\/\/[^\n]*\n\s*)*\}|undefined|null|void 0|\[\]|false)\s*\)/g;

const normalizar = (s) => s.replace(/\r\n/g, "\n");

/** Ficheros de código, derivados del árbol. */
export function ficherosDeCodigo(raiz = RAIZ) {
  try {
    return execFileSync(
      "git",
      ["ls-files", "backend/**/*.ts", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
      { cwd: raiz, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    )
      .split("\n")
      .filter(Boolean)
      .filter((f) => !f.endsWith(".d.ts") && !/__tests__|\.test\.|\.spec\./.test(f));
  } catch {
    return [];
  }
}

/**
 * El bloque `try` que precede a un `catch` en esta posición.
 *
 * Se retrocede emparejando llaves desde el `catch` hasta el `try` que le
 * corresponde. Sin esto habría que adivinar por indentación, y la indentación
 * miente en cuanto alguien envuelve el bloque en un `if`.
 */
function cuerpoDelTry(texto, posCatch) {
  let i = posCatch - 1;
  while (i >= 0 && /\s/.test(texto[i])) i -= 1;
  if (texto[i] !== "}") return null;
  let nivel = 0;
  const fin = i;
  for (; i >= 0; i -= 1) {
    if (texto[i] === "}") nivel += 1;
    else if (texto[i] === "{") {
      nivel -= 1;
      if (nivel === 0) return texto.slice(i + 1, fin);
    }
  }
  return null;
}

/**
 * La expresión a la que pertenece este `.catch(...)`.
 *
 * SE CORTA EN LA FRONTERA DE SENTENCIA, no a tantos caracteres. La primera
 * versión miraba 600 caracteres hacia atrás y señaló `SaasWebhooksService.ts`
 * por un `.catch(() => null)` colgado de `res.text()` — que es correcto—
 * atribuyéndole un `assertSafeEgressUrl` que estaba diez líneas más arriba y no
 * tenía nada que ver.
 *
 * Un `.catch` protege a SU cadena, no a lo que hubiera cerca. Mirar por
 * proximidad es lo mismo que acusar por vecindad.
 */
function cuerpoDeLaCadena(texto, posCatch) {
  const tope = Math.max(0, posCatch - 400);
  let i = posCatch - 1;
  for (; i >= tope; i -= 1) {
    const c = texto[i];
    if (c === ";" || c === "{" || c === "}") break;
  }
  return texto.slice(i + 1, posCatch);
}

export function hallazgosEnFichero(rel, texto) {
  const t = normalizar(texto);
  const fuera = [];
  const linea = (pos) => t.slice(0, pos).split("\n").length;

  for (const m of t.matchAll(SILENCIOSO_LLAVES)) {
    const cuerpo = cuerpoDelTry(t, m.index);
    if (cuerpo === null) continue;
    // El autor dijo que la excepcion se esperaba: no es un descuido.
    if (INTENCION_DECLARADA.test(m[0])) continue;
    const llamada = cuerpo.match(LLAMADA_DE_AUTORIZACION);
    const mencion = cuerpo.match(AUTORIZACION);
    fuera.push({
      fichero: rel,
      linea: linea(m.index),
      forma: "catch vacio",
      fuerza: llamada ? "ALTA" : mencion ? "MEDIA" : "BAJA",
      sensible: Boolean(llamada || mencion),
      porQue: llamada ? llamada[0].replace(/\s*\($/, "") : mencion ? mencion[0] : null,
    });
  }

  for (const m of t.matchAll(SILENCIOSO_PROMESA)) {
    const cuerpo = cuerpoDeLaCadena(t, m.index);
    if (INTENCION_DECLARADA.test(m[0])) continue;
    const llamada = cuerpo.match(LLAMADA_DE_AUTORIZACION);
    const mencion = cuerpo.match(AUTORIZACION);
    fuera.push({
      fichero: rel,
      linea: linea(m.index),
      forma: ".catch que descarta",
      fuerza: llamada ? "ALTA" : mencion ? "MEDIA" : "BAJA",
      sensible: Boolean(llamada || mencion),
      porQue: llamada ? llamada[0].replace(/\s*\($/, "") : mencion ? mencion[0] : null,
    });
  }

  return fuera;
}

function main() {
  const comoJson = process.argv.includes("--json");
  const todos = process.argv.includes("--todos");
  const ficheros = ficherosDeCodigo();
  if (ficheros.length === 0) {
    console.log("NO SE HA LEIDO NINGUN FICHERO. Eso no es un PASS.");
    process.exit(3);
  }

  const todosLos = [];
  for (const rel of ficheros) {
    const abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) continue;
    todosLos.push(...hallazgosEnFichero(rel, fs.readFileSync(abs, "utf8")));
  }
  const sensibles = todosLos.filter((h) => h.sensible);

  if (comoJson) {
    console.log(JSON.stringify({ denominador: ficheros.length, total: todosLos.length, sensibles }, null, 2));
    process.exit(0);
  }

  console.log("RECHAZOS QUE SE TRAGAN\n");
  console.log(`  ficheros de codigo analizados : ${ficheros.length}`);
  console.log(`  catch silenciosos en total    : ${todosLos.length}`);
  console.log(`  ... de ellos, alrededor de codigo de AUTORIZACION: ${sensibles.length}\n`);

  const orden = { ALTA: 0, MEDIA: 1, BAJA: 2 };
  const lista = (todos ? todosLos : sensibles).sort(
    (a, b) => orden[a.fuerza] - orden[b.fuerza] || a.fichero.localeCompare(b.fichero),
  );
  const altas = lista.filter((h) => h.fuerza === "ALTA");
  console.log(`  de fuerza ALTA (hay una LLAMADA de autorizacion dentro): ${altas.length}
`);
  for (const h of lista.slice(0, 60)) {
    console.log(`  [${h.fuerza}] ${h.fichero}:${h.linea}  ${h.forma}${h.porQue ? `  («${h.porQue}»)` : ""}`);
  }
  const mostrados = (todos ? todosLos : sensibles).length;
  if (mostrados > 60) console.log(`  ... y ${mostrados - 60} mas`);

  console.log("");
  console.log("Un catch vacio NO es un defecto: la mayoria son correctos.");
  console.log("Lo que se senala es el que se calla ALREDEDOR de una decision de permisos.");
}

const invocadoDirectamente =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invocadoDirectamente) main();
