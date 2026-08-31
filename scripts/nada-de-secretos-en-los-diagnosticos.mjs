#!/usr/bin/env node
/**
 * NINGUNA HERRAMIENTA DE DIAGNÓSTICO IMPRIME UN SECRETO. **SOLO LECTURA.**
 *
 * POR QUÉ EXISTE. Un script de auditoría imprimió una cadena de conexión
 * recortada a 60 caracteres, y el recorte traía usuario y contraseña. El módulo
 * `backend/seguridad/loQueNoSeImprime.mjs` da la forma correcta de contarlo
 * todo sin contar el valor; esto comprueba que se usa.
 *
 * LA RAZÓN DE SER. Una biblioteca que hay que acordarse de usar no es una
 * defensa: es una recomendación. Lo que convierte la recomendación en defensa
 * es que algo falle cuando alguien no la sigue. Eso es esto.
 *
 * QUÉ BUSCA: una llamada que imprime y, en la misma línea, un valor que viene
 * de una variable de entorno o de un mapa de variables, o un identificador
 * local cuyo nombre dice que lleva un secreto.
 *
 * QUÉ NO BUSCA, y se dice en voz alta:
 *
 *   · un `console.log` repartido en varias líneas se le escapa;
 *   · un secreto guardado en una variable de nombre inocente, también;
 *   · y no entiende el flujo: no sabe de dónde salió realmente el valor.
 *
 * Es un cedazo, no una demostración. Un cedazo que atrapa la forma exacta del
 * fallo que ya ocurrió vale más que un análisis perfecto que nadie escribe.
 *
 * COSTE: 0 €. Lee ficheros.
 *
 * USO
 *   node scripts/nada-de-secretos-en-los-diagnosticos.mjs
 *   node scripts/nada-de-secretos-en-los-diagnosticos.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();

/** Imprime por consola o por la salida estándar. */
const IMPRIME = /console\s*\.\s*(log|info|warn|error|debug|table|dir)\s*\(|process\s*\.\s*stdout\s*\.\s*write\s*\(/;

/** Va por la vía segura: entonces no es un hallazgo. */
const VIA_SEGURA = /\b(describir|describirTodas|redactar|imprimirSeguro|huella)\s*\(/;

/** Nombres de variable local que anuncian que llevan material sensible. */
const LOCAL_SENSIBLE =
  /\b(dsn|token|secret|secreto|password|passwd|clave|apiKey|api_key|apikey|credential|credencial|cookie|authHeader|bearer|connectionString|cadenaDeConexion)\b/i;
const LOCAL_SENSIBLE_G = new RegExp(LOCAL_SENSIBLE.source, "gi");

/** Nombres de variable de entorno cuyo VALOR no debe imprimirse. */
const ENV_SENSIBLE =
  /(PASS|PASSWD|PASSWORD|SECRET|TOKEN|API_?KEY|_KEY\b|CREDENTIAL|PRIVATE|BEARER|COOKIE|SALT|SIGNATURE|SIGNING|DSN|DATABASE_URL|CONNECTION_STRING)/i;

/** Excepciones: contienen la palabra pero no son secretos. */
const ENV_EXCEPCION = /^(AUTH_ENABLED|AUTH_MODE|SESSION_TIMEOUT|SESSION_TTL|TOKEN_TTL|COOKIE_DOMAIN|COOKIE_SAMESITE|COOKIE_SECURE)$/i;

/**
 * Las formas que sí son un hallazgo, cada una con su nombre para poder
 * explicarla en el informe en vez de soltar un número.
 */
/**
 * Proyecciones que NO revelan el secreto.
 *
 * `new URL(dsn).hostname` imprime a qué máquina se conecta uno, que es justo lo
 * que un diagnóstico necesita decir, y no imprime ni el usuario ni la clave.
 * Señalarlo sería el peor resultado posible: un detector que marca lo correcto
 * enseña a la gente a ignorarlo, y entonces deja de proteger también lo demás.
 *
 * La primera versión de esta herramienta señaló seis líneas y las seis eran
 * legítimas. Ese 100 % de falsos positivos es la razón de que esto exista.
 */
const PROYECCION_SEGURA =
  /^\s*(?:\.replace\s*\([^)]*\))?\s*\)*\s*\.\s*(hostname|host|protocol|port|pathname|origin|length|size)\b/;

/** Trozos de código de una línea: lo de fuera de las cadenas, y lo interpolado. */
function fragmentosDeCodigo(linea) {
  const fuera = [];
  // Lo interpolado dentro de una plantilla SÍ es código.
  for (const m of linea.matchAll(/\$\{([^{}]*)\}/g)) fuera.push(m[1]);
  // Y el resto de la línea con las cadenas literales vaciadas: una cadena que
  // sólo NOMBRA un secreto («gh secret set X») no imprime ningún valor.
  fuera.push(
    linea
      .replace(/`[^`]*`/g, "``")
      .replace(/'[^']*'/g, "''")
      .replace(/"[^"]*"/g, '""'),
  );
  return fuera;
}

/**
 * Las formas que sí son un hallazgo, cada una con su nombre para poder
 * explicarla en el informe en vez de soltar un número.
 */
function hallazgosEnLinea(linea) {
  const fuera = [];
  if (!IMPRIME.test(linea)) return fuera;
  if (VIA_SEGURA.test(linea)) return fuera;

  const fragmentos = fragmentosDeCodigo(linea);

  for (const frag of fragmentos) {
    // 1 · process.env.LO_QUE_SEA sensible, impreso tal cual
    for (const m of frag.matchAll(/process\s*\.\s*env\s*\.\s*([A-Z0-9_]+)/gi)) {
      const nombre = m[1];
      if (ENV_EXCEPCION.test(nombre)) continue;
      if (!ENV_SENSIBLE.test(nombre)) continue;
      const despues = frag.slice(m.index + m[0].length);
      if (PROYECCION_SEGURA.test(despues)) continue;
      fuera.push({ forma: "process.env sensible", detalle: nombre });
    }
    // 2 · acceso indexado a un mapa de variables: vars[k], variables[k], env[k]
    for (const m of frag.matchAll(/\b(vars|variables|entorno|secrets|secretos)\s*\[/gi)) {
      const despues = frag.slice(m.index + m[0].length);
      if (/^[^\]]*\]\s*\.\s*(length|size)\b/.test(despues)) continue;
      fuera.push({ forma: "mapa de variables indexado", detalle: `${m[1]}[...]` });
    }
    // 3 · un identificador local que anuncia secreto, sin proyección segura
    for (const m of frag.matchAll(LOCAL_SENSIBLE_G)) {
      const despues = frag.slice(m.index + m[0].length);
      if (PROYECCION_SEGURA.test(despues)) continue;
      fuera.push({ forma: "identificador sensible", detalle: m[0] });
    }
    // 4 · volcar el entorno entero
    if (/JSON\s*\.\s*stringify\s*\(\s*(process\s*\.\s*env|vars|variables)\b/.test(frag)) {
      fuera.push({ forma: "volcado del entorno", detalle: "JSON.stringify(entorno)" });
    }
  }
  // Una misma línea puede disparar la misma forma dos veces; se cuenta una.
  const vistos = new Set();
  return fuera.filter((h) => {
    const k = `${h.forma}|${h.detalle}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

/** Sin CRLF: un `.` no cruza un `\r`, y eso ya costó un falso positivo antes. */
const normalizar = (s) => s.replace(/\r\n/g, "\n");

function ficherosAAuditar(raiz = RAIZ) {
  // Derivado del árbol, no escrito a mano: un inventario a mano se queda corto
  // el día que alguien añade una carpeta, y nadie se entera.
  try {
    return execFileSync("git", ["ls-files", "scripts/*.mjs", "scripts/*.js", "scripts/**/*.mjs"], {
      cwd: raiz,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const comoJson = process.argv.includes("--json");
  const ficheros = ficherosAAuditar();
  const hallazgos = [];

  for (const rel of ficheros) {
    const abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) continue;
    const lineas = normalizar(fs.readFileSync(abs, "utf8")).split("\n");
    lineas.forEach((linea, i) => {
      // Un comentario no ejecuta nada.
      const sinComentario = linea.replace(/^\s*(\/\/|\*|#).*$/, "");
      for (const h of hallazgosEnLinea(sinComentario)) {
        hallazgos.push({ fichero: rel, linea: i + 1, ...h, texto: linea.trim().slice(0, 110) });
      }
    });
  }

  if (comoJson) {
    console.log(JSON.stringify({ denominador: ficheros.length, hallazgos }, null, 2));
    process.exit(hallazgos.length ? 2 : 0);
  }

  console.log("SECRETOS EN HERRAMIENTAS DE DIAGNOSTICO\n");
  console.log(`  ficheros auditados: ${ficheros.length}`);
  if (ficheros.length === 0) {
    // Un denominador de cero no es un aprobado: es que no se ha mirado nada.
    console.log("\n  NO SE HA AUDITADO NINGUN FICHERO. Eso no es un PASS.");
    process.exit(3);
  }
  console.log(`  hallazgos         : ${hallazgos.length}\n`);
  const porFichero = new Map();
  for (const h of hallazgos) {
    if (!porFichero.has(h.fichero)) porFichero.set(h.fichero, []);
    porFichero.get(h.fichero).push(h);
  }
  for (const [f, lista] of [...porFichero.entries()].sort()) {
    console.log(`  ${f}`);
    for (const h of lista) console.log(`     :${h.linea}  ${h.forma} (${h.detalle})\n        ${h.texto}`);
  }
  console.log(hallazgos.length === 0 ? "\nNINGUNA HERRAMIENTA IMPRIME UN SECRETO." : `\n${hallazgos.length} LINEAS QUE PUEDEN IMPRIMIR UN SECRETO.`);
  process.exit(hallazgos.length ? 2 : 0);
}

/**
 * Se exporta para que la prueba pueda ejercitar el detector con casos
 * conocidos —incluida la línea exacta que filtró— en vez de creerse un cero.
 * `main()` sólo corre cuando el fichero se invoca directamente.
 */
export { hallazgosEnLinea, fragmentosDeCodigo, ficherosAAuditar };

const invocadoDirectamente =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invocadoDirectamente) main();
