#!/usr/bin/env node
/**
 * REVISIÓN DE LOS SERVICIOS: qué se queda, qué hay que mejorar, qué sobra.
 *
 * POR QUÉ NO ES UNA OPINIÓN. Un servicio de NELVYON no es una entrada en una
 * lista de precios: es una promesa de que alguien va a hacer un trabajo. Para
 * poder cumplirla hacen falta tres cosas, y las tres se pueden CONTAR:
 *
 *   1. SABER QUÉ NECESITA. Cuántas dimensiones del cerebro declara usar. Un
 *      servicio que declara una sola trabajará prácticamente a ciegas: recibirá
 *      las imprescindibles comunes y nada específico suyo.
 *
 *   2. SABER QUÉ PEDIRLE AL CLIENTE. Cuántas de esas las aporta él. Si son
 *      cero, o el servicio es trivial o nadie ha pensado qué hace falta.
 *
 *   3. TENER QUIEN LO HAGA. Si hay algún departamento operativo cuyo trabajo
 *      cubre ese servicio. Un servicio sin departamento es una promesa sin
 *      dueño.
 *
 * Con eso sale un veredicto por servicio. No es un juicio de valor sobre si el
 * servicio «merece la pena» —eso es una decisión de negocio de Daniel— sino
 * sobre si HOY está en condiciones de prometerse.
 *
 * LOS VEREDICTOS:
 *
 *   MANTENER    definido, con lo que necesita declarado y con quien lo haga.
 *   MEJORAR     existe y se puede prestar, pero está definido a medias.
 *   COMPLETAR   declarado y prácticamente vacío: hoy prometerlo es arriesgado.
 *   REVISAR     algo no cuadra y hace falta que lo mire una persona.
 *
 * NINGÚN veredicto es ELIMINAR. Quitar un servicio es una decisión comercial
 * con consecuencias para clientes que quizá lo tengan contratado, y este script
 * no tiene ni de lejos la información para tomarla. Lo que hace es decir cuáles
 * están flojos.
 *
 * USO
 *   node scripts/revision-de-servicios.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, "docs", "REVISION_DE_SERVICIOS.md");

/**
 * Lee un fichero del arbol, NORMALIZANDO los finales de linea.
 *
 * Hace falta: `departamentos.ts` esta guardado con CRLF y `dimensiones.ts`
 * con LF —cosas de trabajar en Windows con un repositorio que normaliza al
 * confirmar—. Un analisis que parte los bloques por \\n leia 29 dimensiones
 * y CERO departamentos, y la comprobacion de abajo lo canto en vez de dejar
 * pasar un informe construido sobre nada.
 *
 * Depender del final de linea es fragil por definicion; normalizar cuesta una
 * linea.
 */
const leer = (rel) =>
  fs.readFileSync(path.join(RAIZ, rel), "utf8").replace(/\r\n/g, "\n");

// ── Lo que declara cada servicio, sacado del catálogo de dimensiones ────────

const dims = leer("backend/cerebro/dimensiones.ts");

/**
 * Se recorre cada bloque de dimensión y se anota qué servicios la usan y quién
 * la aporta. Es análisis de texto sobre un fichero propio y muy regular; si el
 * fichero cambia de forma, los recuentos salen a cero y eso se ve enseguida en
 * la comprobación de abajo.
 */
const bloques = dims.split(/\n  \{\n/).slice(1);
const porServicio = new Map();
let dimensionesLeidas = 0;

for (const b of bloques) {
  const id = /id:\s*"([^"]+)"/.exec(b)?.[1];
  if (!id) continue;
  dimensionesLeidas += 1;
  const laAporta = /laAporta:\s*"([^"]+)"/.exec(b)?.[1] ?? "?";
  const imprescindible = /imprescindible:\s*true/.test(b);
  const usan = /serviciosQueLaUsan:\s*\[([^\]]*)\]/.exec(b)?.[1] ?? "";
  for (const s of [...usan.matchAll(/"([a-z_]+)"/g)].map((m) => m[1])) {
    if (!porServicio.has(s)) porServicio.set(s, { propias: [], delCliente: 0 });
    const e = porServicio.get(s);
    e.propias.push({ id, laAporta, imprescindible });
    if (laAporta === "cliente") e.delCliente += 1;
  }
}

if (dimensionesLeidas < 10) {
  console.error(
    [
      "[servicios] se han leído " + dimensionesLeidas + " dimensiones del catálogo.",
      "            Son demasiadas pocas: el fichero ha cambiado de forma y este",
      "            análisis estaría contando sobre nada. No se escribe informe.",
    ].join("\n"),
  );
  process.exit(2);
}

// ── Quién puede hacerlo: departamentos operativos ──────────────────────────

const deps = leer("backend/agentes/departamentos.ts");

/**
 * Los departamentos operativos, leídos POR BLOQUE.
 *
 * La primera versión usaba una sola expresión que saltaba desde `id:` hasta el
 * siguiente `estado: "operativo"` dentro de 900 caracteres. Con bloques largos
 * eso se salta al departamento siguiente: `marca`, que ES operativo, salía como
 * que no, y `branding_premium` recibía un veredicto REVISAR falso.
 *
 * Un análisis que se equivoca hacia el lado alarmista es igual de inútil que
 * uno que se equivoca hacia el tranquilizador: los dos hacen que se deje de
 * leer el informe. Ahora cada bloque se lee entero y por separado, que es
 * correcto por construcción y además se entiende.
 */
const operativos = new Set();
let departamentosLeidos = 0;
for (const b of deps.split(/\n  \{\n/).slice(1)) {
  const id = /id:\s*"([a-z_]+)"/.exec(b)?.[1];
  if (!id) continue;
  departamentosLeidos += 1;
  // Sólo hasta el final de ESTE bloque.
  const propio = b.split(/\n  \},/)[0];
  if (/estado:\s*"operativo"/.test(propio)) operativos.add(id);
}

if (departamentosLeidos < 10) {
  console.error(
    "[servicios] sólo se han leído " + departamentosLeidos + " departamentos. " +
    "El fichero ha cambiado de forma y el análisis contaría sobre nada.",
  );
  process.exit(2);
}

/**
 * Qué departamento cubre cada servicio.
 *
 * El mapa es explícito y corto a propósito: deducirlo del nombre daría
 * resultados plausibles y equivocados —`funnel_premium` no lo hace un
 * departamento llamado «funnel_premium»— y un mapa equivocado aquí produce un
 * informe que dice que hay dueño donde no lo hay.
 */
const DEPARTAMENTO_DE = {
  ads_premium: ["paid_media"],
  seo_premium: ["seo", "seo_tecnico", "seo_local"],
  social_media_premium: ["social"],
  contenido_copywriting_premium: ["contenido", "copy"],
  email_marketing_premium: ["email_lifecycle", "crm"],
  funnel_premium: ["funnels", "cro"],
  ecommerce_premium: ["ecommerce"],
  branding_premium: ["marca"],
  diseno_grafico_creatividades_premium: ["creatividad"],
  influencer_marketing_premium: [],
  bots_premium: [],
  canales_comunicaciones_premium: [],
  advisor_empresarial_premium: ["estrategia"],
};

// ── Veredicto ───────────────────────────────────────────────────────────────

function veredictoDe(servicio, datos) {
  const propias = datos.propias.length;
  const cubre = (DEPARTAMENTO_DE[servicio] ?? []).filter((d) => operativos.has(d));

  if (cubre.length === 0) {
    return {
      veredicto: "REVISAR",
      porQue:
        "ningún departamento operativo lo cubre. Es una promesa sin dueño: si un " +
        "cliente lo contrata hoy, no hay a quién asignárselo.",
    };
  }
  if (propias <= 1) {
    return {
      veredicto: "COMPLETAR",
      porQue:
        `declara ${propias} dimensión(es) propias. Recibirá las imprescindibles ` +
        "comunes y prácticamente nada específico suyo: trabajaría a ciegas sobre " +
        "lo que hace distinto a este servicio.",
    };
  }
  if (propias <= 3 || datos.delCliente === 0) {
    return {
      veredicto: "MEJORAR",
      porQue:
        `declara ${propias} dimensiones propias y ${datos.delCliente} que aporta el ` +
        "cliente. Se puede prestar, pero está definido a medias.",
    };
  }
  return {
    veredicto: "MANTENER",
    porQue:
      `${propias} dimensiones propias, ${datos.delCliente} del cliente, cubierto por ` +
      `${cubre.join(", ")}.`,
  };
}

const filas = [...porServicio.entries()]
  .map(([servicio, datos]) => ({
    servicio,
    propias: datos.propias.length,
    delCliente: datos.delCliente,
    departamentos: (DEPARTAMENTO_DE[servicio] ?? []).filter((d) => operativos.has(d)),
    ...veredictoDe(servicio, datos),
  }))
  .sort((a, b) => b.propias - a.propias);

const cuenta = {};
for (const f of filas) cuenta[f.veredicto] = (cuenta[f.veredicto] ?? 0) + 1;

const md = `# Revisión de los servicios

> Generado por \`scripts/revision-de-servicios.mjs\` el ${new Date().toISOString().slice(0, 10)}.
> No se edita a mano: se regenera.

Un servicio de NELVYON no es una línea en una lista de precios: es la promesa de
que alguien va a hacer un trabajo. Para poder cumplirla hacen falta tres cosas,
y las tres se pueden **contar**:

1. **saber qué necesita** — cuántas dimensiones del cerebro declara usar;
2. **saber qué pedirle al cliente** — cuántas las aporta él;
3. **tener quien lo haga** — algún departamento operativo que lo cubra.

De ahí sale el veredicto. **No es un juicio sobre si el servicio merece la
pena** —eso es una decisión de negocio— sino sobre si **hoy está en condiciones
de prometerse**.

| Veredicto | Cuántos | Qué significa |
|---|---|---|
| MANTENER | ${cuenta.MANTENER ?? 0} | definido, con lo que necesita y con dueño |
| MEJORAR | ${cuenta.MEJORAR ?? 0} | se puede prestar, pero está definido a medias |
| COMPLETAR | ${cuenta.COMPLETAR ?? 0} | declarado y casi vacío: prometerlo hoy es arriesgado |
| REVISAR | ${cuenta.REVISAR ?? 0} | algo no cuadra; que lo mire una persona |

**Ningún veredicto es ELIMINAR.** Quitar un servicio afecta a clientes que quizá
lo tengan contratado, y este análisis no tiene ni de lejos la información para
esa decisión. Sólo dice cuáles están flojos.

---

## Servicio a servicio

| Servicio | Dimensiones propias | Las aporta el cliente | Departamento | Veredicto |
|---|---:|---:|---|---|
${filas
  .map(
    (f) =>
      `| \`${f.servicio}\` | ${f.propias} | ${f.delCliente} | ${
        f.departamentos.length ? f.departamentos.join(", ") : "**ninguno**"
      } | **${f.veredicto}** |`,
  )
  .join("\n")}

---

## El detalle, y qué haría falta

${filas.map((f) => `### \`${f.servicio}\` — ${f.veredicto}\n\n${f.porQue}\n`).join("\n")}

---

## Lo que este informe NO dice

- **No dice qué servicio vende más ni cuál es más rentable.** Eso no está medido
  y no se puede deducir del árbol.
- **No dice que los MANTENER sean buenos**, sólo que están definidos. Un
  servicio bien definido puede prestarse mal.
- **No compara con lo que ofrece nadie más.** Afirmar qué incluye el servicio de
  otro sin haberlo mirado es inventar.

La medida que falta —y la que de verdad decidiría esto— es qué resultado obtiene
un cliente con cada servicio. Hoy es \`NO_MEDIDO\`, y lo dice
\`docs/LO_QUE_SE_PUEDE_AFIRMAR.md\`.
`;

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, md, "utf8");

console.log("\nREVISIÓN DE SERVICIOS");
console.log(`  ${dimensionesLeidas} dimensiones leídas · ${filas.length} servicios\n`);
for (const [v, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${v}`);
}
const flojos = filas.filter((f) => f.veredicto === "COMPLETAR" || f.veredicto === "REVISAR");
if (flojos.length) {
  console.log(`\n  Los que hay que mirar (${flojos.length}):`);
  for (const f of flojos) console.log(`    · ${f.servicio.padEnd(40)} ${f.veredicto}`);
}
console.log(`\n  escrito en ${path.relative(RAIZ, SALIDA)}\n`);
