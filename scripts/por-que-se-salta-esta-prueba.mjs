#!/usr/bin/env node
/**
 * ¿POR QUÉ SE SALTA CADA PRUEBA? **SOLO LECTURA.**
 *
 * POR QUÉ EXISTE. La suite dice «976 skipped» y ese número no significa nada
 * por sí solo. Puede ser 976 pruebas de integración que necesitan una base
 * —correcto— o 976 pruebas que alguien desactivó un martes y nadie volvió a
 * mirar. Las dos cosas se ven exactamente igual en el resumen.
 *
 * Y un `skip` es la forma más silenciosa de perder cobertura: la suite sigue
 * saliendo verde, el contador de fallos sigue en cero, y la prueba lleva meses
 * sin ejecutarse.
 *
 * QUÉ HACE. Lee la CONDICIÓN de cada salto y la clasifica:
 *
 *   ENTORNO_AUSENTE ......... depende de una variable que no está puesta
 *                             (`NELVYON_PG_CERT_DSN`, `DATABASE_URL`…).
 *                             Correcto: sin base no se puede probar la base.
 *   PROVEEDOR_EXTERNO ....... necesita una credencial o un servicio de pago.
 *                             Correcto y además obligatorio aquí: no se activan.
 *   SOLO_PRODUCCION ......... sólo tiene sentido contra producción.
 *   ESPECIFICO_DE_PLATAFORMA  depende del sistema operativo o del navegador.
 *   INTEGRACION_DELIBERADA .. salto explicado en el propio código.
 *   SIN_RAZON_VISIBLE ....... `describe.skip` / `it.skip` a secas. **Ésta es
 *                             la que hay que mirar**: nadie escribió por qué.
 *
 * LO QUE NO HACE: no ejecuta nada, no desbloquea nada y no usa credenciales.
 * Clasifica lo que el código dice de sí mismo.
 *
 * LO QUE NO PUEDE SABER: si la razón escrita sigue siendo cierta. Un salto que
 * dice «necesita Docker» sigue diciéndolo aunque Docker ya esté. Para eso hace
 * falta leerlo.
 *
 * COSTE: 0 €. Lee ficheros.
 *
 * USO
 *   node scripts/por-que-se-salta-esta-prueba.mjs
 *   node scripts/por-que-se-salta-esta-prueba.mjs --json
 *   node scripts/por-que-se-salta-esta-prueba.mjs --sospechosos
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = process.cwd();

/** Qué dice la condición del salto. El orden importa: gana la primera. */
const CLASES = [
  // `MODELO`/`hayModelo`/`OLLAMA` entran aquí y no en PROVEEDOR_EXTERNO: la
  // inferencia local corre en hardware que ya existe y no factura nada. Es
  // infraestructura ausente, igual que una base que no está levantada, y
  // meterla con los proveedores de pago daría a entender que cuesta dinero.
  [
    /CERT_DSN|DATABASE_URL|PG_DSN|_DSN\b|POSTGRES|pgvector|REDIS_URL|UPSTASH|OLLAMA|hayModelo|\bMODELO\b|\bmodelos\b/i,
    "ENTORNO_AUSENTE",
  ],
  [/OPENAI|ANTHROPIC|STRIPE|RESEND|SES_|AWS_|META_|GOOGLE_|TWILIO|API_KEY|TOKEN/i, "PROVEEDOR_EXTERNO"],
  [/PROD|PRODUCCION|STAGING|LIVE/i, "SOLO_PRODUCCION"],
  [/win32|darwin|linux|platform|process\.platform|chromium|webkit|firefox/i, "ESPECIFICO_DE_PLATAFORMA"],
  [/DOCKER|CONTAINER|E2E|INTEGRATION|INTEGRACION/i, "INTEGRACION_DELIBERADA"],
];

/** Ficheros de prueba, derivados del árbol. */
export function ficherosDePrueba(raiz = RAIZ) {
  try {
    return execFileSync("git", ["ls-files"], { cwd: raiz, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter((f) => f && /\.(test|spec)\.(ts|tsx|js|mjs)$/.test(f))
      // `skipsAreGated` es el guardian que vigila que no haya un
      // `describe.skip` sin condicion. Sus cadenas de deteccion SON el
      // patron que busca, asi que se senala a si mismo. Acusar al
      // vigilante es el falso positivo mas tonto posible.
      .filter((f) => !/skipsAreGated/.test(f));
  } catch {
    return [];
  }
}

export function clasificar(condicion) {
  if (!condicion || !condicion.trim()) return "SIN_RAZON_VISIBLE";
  for (const [re, clase] of CLASES) if (re.test(condicion)) return clase;
  return "CONDICIONAL_SIN_CLASIFICAR";
}

/**
 * A qué apunta un nombre de variable dentro de este mismo fichero.
 *
 * SIN ESTO LA HERRAMIENTA NO SIRVE. La forma que este repositorio usa de verdad
 * es `const conBase = DSN ? describe : describe.skip`, donde la condición es
 * `DSN` — un nombre, no una razón. La primera versión clasificó 96 de 102
 * saltos como «sin clasificar», que es lo mismo que no clasificar nada.
 *
 * Se tira del hilo: `conBase` → `DSN` → `process.env.NELVYON_PG_CERT_DSN`. Tres
 * saltos bastan; más sería perseguir indirecciones que nadie escribe.
 */
export function resolverNombre(texto, nombre, profundidad = 0) {
  if (profundidad > 3) return nombre;
  const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const def = new RegExp(`const\\s+${escapado}\\s*=\\s*([^;\n]+)`).exec(texto);
  if (!def) return nombre;
  const valor = def[1].trim();

  // Si el valor es OTRO identificador suelto, se sigue tirando del hilo.
  if (/^[A-Za-z_$][\w$]*$/.test(valor)) return resolverNombre(texto, valor, profundidad + 1);

  // Y si menciona identificadores en mayúsculas, se traen sus definiciones:
  // así `Boolean(DSN_APP && DSN_JOBS)` acaba trayendo los dos nombres reales.
  const referidos = [...valor.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)]
    .map((m) => m[1])
    .filter((n) => n !== nombre);
  const extra = [...new Set(referidos)]
    .map((n) => resolverNombre(texto, n, profundidad + 1))
    .join(" ");
  return `${valor} ${extra}`.trim();
}

/**
 * Los saltos de un fichero, con la condición que los gobierna.
 *
 * Se reconocen las formas que este repositorio usa de verdad:
 *
 *   const conBase = DSN ? describe : describe.skip;   <- la más común aquí
 *   describe.skip("…")                                <- salto duro
 *   it.skip("…")
 *   it.skipIf(!algo)("…")
 *   describe.runIf(algo)("…")
 */
export function saltosDe(rel, texto) {
  const t = texto.replace(/\r\n/g, "\n");
  const lineas = t.split("\n");
  const fuera = [];

  // 1 · alias condicionales: `const X = cond ? describe : describe.skip`
  const alias = new Map();
  for (const m of t.matchAll(
    /const\s+([A-Za-zÀ-ÿ_$][\w$]*)\s*=\s*([^;\n]*?)\s*\?\s*(describe|it|test)\s*:\s*\3\.skip/g,
  )) {
    const bruto = m[2].trim();
    // Si la condicion es un identificador, se resuelve a lo que apunta.
    alias.set(m[1], /^[A-Za-z_$][\w$]*$/.test(bruto) ? resolverNombre(t, bruto) : bruto);
  }

  lineas.forEach((linea, i) => {
    // 2 · saltos duros, sin condición ninguna
    const duro = /\b(describe|it|test)\s*\.\s*skip\s*\(/.exec(linea);
    if (duro) {
      fuera.push({ fichero: rel, linea: i + 1, forma: `${duro[1]}.skip`, condicion: "", clase: "SIN_RAZON_VISIBLE" });
      return;
    }
    // 3 · saltos condicionados en la propia llamada
    const cond = /\b(describe|it|test)\s*\.\s*(skipIf|runIf)\s*\(([^)]*)\)/.exec(linea);
    if (cond) {
      fuera.push({
        fichero: rel,
        linea: i + 1,
        forma: `${cond[1]}.${cond[2]}`,
        condicion: cond[3].trim(),
        clase: clasificar(
          /^[!\s]*[A-Za-z_$][\w$]*$/.test(cond[3].trim())
            ? resolverNombre(t, cond[3].trim().replace(/^[!\s]+/, ""))
            : cond[3],
        ),
      });
      return;
    }
    // 4 · uso de un alias condicional
    for (const [nombre, condicion] of alias) {
      if (new RegExp(`\\b${nombre}\\s*\\(`).test(linea)) {
        fuera.push({
          fichero: rel,
          linea: i + 1,
          forma: `alias ${nombre}`,
          condicion,
          clase: clasificar(condicion),
        });
        return;
      }
    }
  });

  return fuera;
}

function main() {
  const comoJson = process.argv.includes("--json");
  const soloSospechosos = process.argv.includes("--sospechosos");
  const ficheros = ficherosDePrueba();
  if (ficheros.length === 0) {
    console.log("NO SE HA LEIDO NINGUN FICHERO DE PRUEBA. Eso no es un PASS.");
    process.exit(3);
  }

  const saltos = [];
  for (const rel of ficheros) {
    const abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) continue;
    saltos.push(...saltosDe(rel, fs.readFileSync(abs, "utf8")));
  }

  const porClase = new Map();
  for (const s of saltos) porClase.set(s.clase, [...(porClase.get(s.clase) ?? []), s]);
  const sospechosos = saltos.filter(
    (s) => s.clase === "SIN_RAZON_VISIBLE" || s.clase === "CONDICIONAL_SIN_CLASIFICAR",
  );

  if (comoJson) {
    console.log(JSON.stringify({ ficheros: ficheros.length, saltos, sospechosos }, null, 2));
    process.exit(0);
  }

  console.log("POR QUE SE SALTA CADA PRUEBA\n");
  console.log(`  ficheros de prueba : ${ficheros.length}`);
  console.log(`  puntos de salto    : ${saltos.length}\n`);
  for (const [clase, lista] of [...porClase.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(lista.length).padStart(4)}  ${clase}`);
  }
  console.log("");
  console.log(`  SOSPECHOSOS (sin razon escrita o sin clasificar): ${sospechosos.length}`);
  if (sospechosos.length > 0 || soloSospechosos) {
    for (const s of sospechosos.slice(0, 40)) {
      console.log(`     ${s.fichero}:${s.linea}  ${s.forma}${s.condicion ? `  «${s.condicion.slice(0, 60)}»` : ""}`);
    }
    if (sospechosos.length > 40) console.log(`     ... y ${sospechosos.length - 40} mas`);
  }
  console.log("");
  console.log("Un salto con razon escrita NO es un defecto. El que no la tiene, hay que mirarlo.");
}

const invocadoDirectamente =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invocadoDirectamente) main();
