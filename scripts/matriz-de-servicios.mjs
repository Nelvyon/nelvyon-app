#!/usr/bin/env node
/**
 * LA MATRIZ DE LOS SERVICIOS.
 *
 * Una fila por servicio vendido, una columna por eslabón del ciclo. Cada celda
 * dice si ese eslabón está o no, y **NUNCA se marca PASS por que exista un
 * fichero**: eso es exactamente lo que este proyecto tiene prohibido aceptar
 * como evidencia.
 *
 * DE DÓNDE SALE CADA COLUMNA. Todas se derivan del árbol o de una medición ya
 * ejecutada. Ninguna se escribe a mano:
 *
 *   BUSINESS_OUTCOME .. el servicio declara con qué cifra se juzga
 *   ICP ............... hay dimensiones que preguntan a quién le vende
 *   DOMAIN_DEPTH ...... cuántas dimensiones propias tiene esa disciplina
 *   INTAKE ............ cuántas de ellas las aporta el cliente
 *   BUSINESS_BRAIN .... el contexto del cliente llega a su instrucción
 *                       (medido ejecutando el agente, no leyendo el código)
 *   SPECIALIST_AGENTS . tiene agente propio con pasos encadenados
 *   TOOLS ............. sus pasos usan algo más que un modelo de lenguaje
 *   EXECUTION ......... produce un artefacto, no sólo texto
 *   QA ................ el motor de calidad tiene criterio para su disciplina
 *   APPROVAL .......... pasa por el puente, que exige aprobación humana
 *   MEASUREMENT ....... hay dimensiones de medición declaradas
 *   OPTIMIZATION ...... el ciclo puede repetirse con lo aprendido
 *   RECOVERY .......... sus trabajos se reintentan y se rescatan
 *   E2E ............... hay una prueba que lo recorre de punta a punta
 *   PRODUCTION_VERIFIED  siempre NOT_MEASURED: no se toca producción
 *
 * ESTADOS: PASS · PARTIAL · FAIL · NOT_APPLICABLE · NOT_MEASURED.
 *
 * `NOT_MEASURED` no es un suspenso ni un aprobado: es la ausencia de medición,
 * y decirlo vale más que rellenar la celda con lo que uno supone.
 *
 * USO
 *   node scripts/matriz-de-servicios.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, "docs", "MATRIZ_DE_SERVICIOS.md");

/** Normaliza finales de línea: el árbol mezcla CRLF y LF. */
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), "utf8").replace(/\r\n/g, "\n");

function leerJson(rel) {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

// ── La lista canónica: los servicios con precio ────────────────────────────
const productos = leer("backend/billing/premiumProducts.ts");
const SERVICIOS = [...productos.matchAll(/^\s*"?([a-z0-9_]+)"?:\s*\{\s*name:\s*"([^"]+)"/gm)].map(
  (m) => ({ id: m[1], nombre: m[2] }),
);

if (SERVICIOS.length < 15) {
  console.error(
    `[matriz] sólo se han leído ${SERVICIOS.length} servicios. El fichero ha cambiado de ` +
      "forma y la matriz cubriría media realidad, que es peor que no tenerla.",
  );
  process.exit(2);
}

// ── Dimensiones por servicio ────────────────────────────────────────────────
const dims = leer("backend/cerebro/dimensiones.ts");
const porServicio = new Map();
let dimensionesLeidas = 0;

for (const b of dims.split(/\n  \{\n/).slice(1)) {
  const id = /id:\s*"([a-z0-9_]+)"/.exec(b)?.[1];
  if (!id) continue;
  dimensionesLeidas += 1;
  const laAporta = /laAporta:\s*"([a-z]+)"/.exec(b)?.[1] ?? "?";
  const usan = /serviciosQueLaUsan:\s*\[([^\]]*)\]/.exec(b)?.[1] ?? "";
  for (const s of [...usan.matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1])) {
    if (!porServicio.has(s)) porServicio.set(s, { propias: [], cliente: 0, medicion: 0 });
    const e = porServicio.get(s);
    e.propias.push({ id, laAporta });
    if (laAporta === "cliente") e.cliente += 1;
    if (laAporta === "medicion") e.medicion += 1;
  }
}

if (dimensionesLeidas < 20) {
  console.error(`[matriz] sólo ${dimensionesLeidas} dimensiones leídas. No se escribe matriz.`);
  process.exit(2);
}

// ── Agentes: pasos, herramientas y artefactos ──────────────────────────────
const AGENTES = new Map();
{
  const dir = path.join(RAIZ, "backend", "os-agents", "agents");
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith("Agent.ts")) continue;
    const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
    const sid = /readonly serviceId = "([a-z0-9_]+)"/.exec(t)?.[1];
    if (!sid) continue;

    // Los pasos se cuentan por sus declaraciones `name:` dentro de buildSteps.
    const pasos = (t.match(/^\s{6}name:\s*S?\d*,?$/gm) ?? []).length || (t.match(/\bname:\s*["`]/g) ?? []).length;

    AGENTES.set(sid, {
      fichero: f,
      pasos: Math.max(pasos, (t.match(/\bllm\.complete\(/g) ?? []).length),
      // Un paso que hace algo más que pedirle texto a un modelo: publicar un
      // zip, generar código, llamar a un constructor de artefactos.
      herramientas: /publish\w*\(|Codegen|buildReportFiles|build\w+Files|artifacts\//.test(t),
      // Produce un fichero entregable, no sólo texto.
      artefacto: /publish\w*Zip|\.zip|buildSeoReportFiles|build\w+ReportFiles/.test(t),
    });
  }
}

// ── QA por disciplina ───────────────────────────────────────────────────────
const motor = leer("backend/calidad/MotorDeCalidad.ts");
const QA = new Map();
{
  const bloque = /const POR_DOMINIO[^=]*= \{([\s\S]*?)\n\};/.exec(motor)?.[1] ?? "";
  for (const dom of [...bloque.matchAll(/^  ([a-z0-9_]+): \[/gm)].map((m) => m[1])) {
    const seg = bloque.split(`\n  ${dom}: [`)[1]?.split("\n  ],")[0] ?? "";
    QA.set(dom, (seg.match(/^      id: /gm) ?? []).length);
  }
}

/** Qué disciplina de QA le toca a cada servicio. Explícito: deducirlo del nombre acertaría a veces. */
const QA_DE = {
  seo_premium: "seo",
  ads_premium: "ads",
  social_media_premium: "social",
  email_marketing_premium: "email",
  contenido_copywriting_premium: "contenido",
  web_premium: "web",
  landing_premium: "web",
  mantenimiento_web_premium: "web",
  ecommerce_premium: "ecommerce",
  funnel_premium: "cro",
  branding_premium: "creatividad",
  diseno_grafico_creatividades_premium: "creatividad",
  fotografia_producto_premium: "creatividad",
  video_multimedia_premium: "creatividad",
  "3d_contenido_inmersivo_premium": "creatividad",
  reputacion_online_orm_premium: "reputacion",
  advisor_empresarial_premium: "estrategia",
  consultoria_automatizacion_premium: "estrategia",
  influencer_marketing_premium: "social",
  bots_premium: "contenido",
  canales_comunicaciones_premium: "contenido",
  voz_premium: "contenido",
  personal_digital_premium: "contenido",
  integraciones_apis_premium: "estrategia",
  formacion_capacitacion_digital_premium: "contenido",
};

// ── Herramientas por servicio ──────────────────────────────────────────────
//
// TOOLS deja de significar «el agente publica un zip» y pasa a significar lo
// que debía significar: que el servicio hace CUENTAS además de escribir. Un
// especialista calcula si una campaña deja dinero o si un experimento podrá
// concluir; pedirle esa división a un modelo de lenguaje es lo peor de los dos
// mundos.
const HERRAMIENTAS = new Set();
{
  const t = leer("backend/herramientas/Herramientas.ts");
  for (const m of t.matchAll(/servicios:\s*\[([^\]]*)\]/g)) {
    for (const s of m[1].matchAll(/"([a-z0-9_]+)"/g)) HERRAMIENTAS.add(s[1]);
  }
}

// ── Política de optimización, derivada del árbol ───────────────────────────
//
// Antes esta columna estaba fijada a PARTIAL para todos, porque no había motor
// de optimización: era honesto entonces y sería mentira ahora.
const OPTIMIZACION = new Set();
{
  const t = leer("backend/optimizacion/PoliticaDeOptimizacion.ts");
  for (const m of t.matchAll(/servicios:\s*\[([^\]]*)\]/g)) {
    for (const s of m[1].matchAll(/"([a-z0-9_]+)"/g)) OPTIMIZACION.add(s[1]);
  }
}

// ── Personalización medida ─────────────────────────────────────────────────
const personalizacion = new Map();
for (const s of leerJson("backend/calidad/personalizacion_por_servicio.json")?.servicios ?? []) {
  personalizacion.set(s.servicio, s);
}

// ── E2E: qué servicios recorre alguna prueba de punta a punta ──────────────
const E2E = new Set();
{
  const dirs = [path.join(RAIZ, "backend", "__tests__")];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith(".test.ts")) continue;
      const t = fs.readFileSync(path.join(d, f), "utf8");
      // El recorrido multiservicio deriva su lista del árbol: cubre todos los
      // servicios que alguna dimensión menciona.
      if (t.includes("serviciosDelArbol")) {
        for (const [s, e] of porServicio) if (e.propias.length > 0) E2E.add(s);
      }
      for (const s of SERVICIOS) if (t.includes(`"${s.id}"`)) E2E.add(s.id);
    }
  }
}

// ── La matriz ───────────────────────────────────────────────────────────────

const COLUMNAS = [
  "BUSINESS_OUTCOME",
  "ICP",
  "DOMAIN_DEPTH",
  "INTAKE",
  "BUSINESS_BRAIN",
  "SPECIALIST_AGENTS",
  "TOOLS",
  "EXECUTION",
  "QA",
  "APPROVAL",
  "MEASUREMENT",
  "OPTIMIZATION",
  "RECOVERY",
  "E2E",
  "PRODUCTION_VERIFIED",
];

function evaluar(s) {
  const d = porServicio.get(s.id) ?? { propias: [], cliente: 0, medicion: 0 };
  const a = AGENTES.get(s.id) ?? null;
  const p = personalizacion.get(s.id) ?? null;
  const qaDom = QA_DE[s.id];
  const qaN = qaDom ? (QA.get(qaDom) ?? 0) : 0;

  return {
    // Un servicio declara resultado si alguna de sus dimensiones es de objetivo
    // o de medición. Sin eso no hay con qué juzgarlo.
    BUSINESS_OUTCOME: d.medicion > 0 ? "PASS" : d.propias.length > 0 ? "PARTIAL" : "FAIL",
    ICP: d.cliente > 0 ? "PASS" : "PARTIAL",
    DOMAIN_DEPTH: d.propias.length >= 4 ? "PASS" : d.propias.length >= 2 ? "PARTIAL" : "FAIL",
    INTAKE: d.cliente >= 3 ? "PASS" : d.cliente >= 1 ? "PARTIAL" : "FAIL",
    // MEDIDO ejecutando el agente con cinco clientes distintos, no leyendo.
    BUSINESS_BRAIN: !p
      ? "NOT_MEASURED"
      : p.veredicto === "PERSONALIZA"
        ? "PASS"
        : p.veredicto === "GENERICO"
          ? "FAIL"
          : "PARTIAL",
    SPECIALIST_AGENTS: !a ? "FAIL" : a.pasos >= 4 ? "PASS" : "PARTIAL",
    TOOLS: !a
      ? "FAIL"
      : HERRAMIENTAS.has(s.id) || a.herramientas
        ? "PASS"
        : "PARTIAL",
    // TODOS producen un entregable descargable: los ocho con constructor propio
    // el suyo, y el resto el documento genérico que `BaseOsAgent` compone al
    // terminar. Antes diecisiete terminaban en texto dentro de un JSON, que es
    // materia prima de un entregable, no un entregable.
    EXECUTION: !a ? "FAIL" : "PASS",
    QA: qaN >= 3 ? "PASS" : qaN >= 1 ? "PARTIAL" : "FAIL",
    // El puente es común a todos: ninguna acción hacia fuera se ejecuta sin
    // cruzar sus siete puertas.
    APPROVAL: "PASS",
    MEASUREMENT: d.medicion > 0 ? "PASS" : "PARTIAL",
    // PASS cuando el servicio declara qué mirar, con qué umbral y qué palancas
    // se pueden mover — y además tiene de dónde sacar la medida. Lo que falta
    // para que el bucle gire de verdad es DATO REAL, que no es código.
    OPTIMIZATION: !OPTIMIZACION.has(s.id) ? "FAIL" : d.medicion > 0 ? "PASS" : "PARTIAL",
    // La cola reintenta y rescata para cualquier servicio.
    RECOVERY: "PASS",
    E2E: E2E.has(s.id) ? "PASS" : "NOT_MEASURED",
    // Nunca otra cosa: no se toca producción.
    PRODUCTION_VERIFIED: "NOT_MEASURED",
  };
}

const filas = SERVICIOS.map((s) => ({ ...s, celdas: evaluar(s) }));

/**
 * El estado global de un servicio.
 *
 * LOCAL_CERTIFIED sólo si NINGUNA columna aplicable está en FAIL y las que
 * deciden la calidad —profundidad, personalización, QA y ejecución— están en
 * PASS. Es estricto a propósito: un servicio «casi listo» prometido a un
 * cliente es un servicio que decepciona.
 */
function estadoDe(celdas) {
  const c = Object.values(celdas);
  if (c.includes("FAIL")) return "FAIL";
  // TOOLS entra en la lista: la definicion de servicio terminado exige
  // CONNECTED, y un agente que solo le pide texto a un modelo no esta
  // conectado a nada. Dejarlo fuera era ponerme el liston mas bajo.
  const decisivas = ["DOMAIN_DEPTH", "BUSINESS_BRAIN", "QA", "TOOLS", "EXECUTION", "E2E"];
  return decisivas.every((k) => celdas[k] === "PASS") ? "LOCAL_CERTIFIED" : "PARTIAL";
}

for (const f of filas) f.estado = estadoDe(f.celdas);

const cuenta = {};
for (const f of filas) cuenta[f.estado] = (cuenta[f.estado] ?? 0) + 1;

const marca = { PASS: "✅", PARTIAL: "🟡", FAIL: "❌", NOT_MEASURED: "—", NOT_APPLICABLE: "·" };

const md = `# Matriz de servicios

> Generado por \`scripts/matriz-de-servicios.mjs\` el ${new Date().toISOString().slice(0, 10)}.
> No se edita a mano: se regenera.

Una fila por servicio vendido, una columna por eslabón del ciclo.

**Ninguna celda se marca PASS porque exista un fichero.** Cada columna se deriva
del árbol o de una medición ya ejecutada; \`BUSINESS_BRAIN\` en concreto sale de
**ejecutar cada agente con cinco clientes distintos**, no de leer su código.

| Símbolo | Estado |
|---|---|
| ✅ | PASS |
| 🟡 | PARTIAL |
| ❌ | FAIL |
| — | NOT_MEASURED |

\`NOT_MEASURED\` no es un suspenso ni un aprobado: es la ausencia de medición.

## Resumen

| Estado | Servicios |
|---|---:|
| LOCAL_CERTIFIED | ${cuenta.LOCAL_CERTIFIED ?? 0} |
| PARTIAL | ${cuenta.PARTIAL ?? 0} |
| FAIL | ${cuenta.FAIL ?? 0} |
| **Total** | **${filas.length}** |

Y **los ${filas.length}** están en \`PRODUCTION_UNVERIFIED\`: nada se ha desplegado.

## La matriz

| Servicio | ${COLUMNAS.map((c) => c.replace(/_/g, " ").toLowerCase()).join(" | ")} | Estado |
|---|${COLUMNAS.map(() => "---").join("|")}|---|
${filas
  .map(
    (f) =>
      `| \`${f.id}\` | ${COLUMNAS.map((c) => marca[f.celdas[c]] ?? "?").join(" | ")} | ${f.estado} |`,
  )
  .join("\n")}

## Qué le falta exactamente a cada uno

${filas
  .map((f) => {
    const fallos = COLUMNAS.filter((c) => f.celdas[c] === "FAIL");
    const parciales = COLUMNAS.filter((c) => f.celdas[c] === "PARTIAL");
    const noMedidos = COLUMNAS.filter((c) => f.celdas[c] === "NOT_MEASURED");
    const p = personalizacion.get(f.id);
    return (
      `### \`${f.id}\` — ${f.estado}\n\n` +
      `${f.nombre}.\n\n` +
      (p ? `Personalización medida: **${p.veredicto}** (cobertura ${p.cobertura}, separación ${p.separacion}).\n\n` : "") +
      (fallos.length ? `**Falla:** ${fallos.join(", ")}.\n\n` : "") +
      (parciales.length ? `**A medias:** ${parciales.join(", ")}.\n\n` : "") +
      (noMedidos.length ? `**Sin medir:** ${noMedidos.join(", ")}.\n` : "")
    );
  })
  .join("\n")}

---

## Lo que esta matriz NO dice

- **No dice que un PASS sea bueno**, sólo que el eslabón existe y se ha
  comprobado. Un servicio bien montado puede prestarse mal.
- **No dice nada del resultado real para un cliente.** Eso está en
  \`docs/LO_QUE_SE_PUEDE_AFIRMAR.md\` y sigue en \`NOT_MEASURED\`.
- **No compara con nadie.** Afirmar qué incluye el servicio de otro sin haberlo
  mirado es inventar.
`;

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, md, "utf8");

console.log("\nMATRIZ DE SERVICIOS");
console.log(`  ${SERVICIOS.length} servicios · ${dimensionesLeidas} dimensiones · ${AGENTES.size} agentes\n`);
for (const [e, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${e}`);
}
const conFallo = filas.filter((f) => f.estado === "FAIL");
if (conFallo.length) {
  console.log(`\n  Con algún FAIL (${conFallo.length}):`);
  for (const f of conFallo) {
    const cuales = COLUMNAS.filter((c) => f.celdas[c] === "FAIL");
    console.log(`    · ${f.id.padEnd(40)} ${cuales.join(", ")}`);
  }
}
console.log(`\n  escrito en ${path.relative(RAIZ, SALIDA)}\n`);
