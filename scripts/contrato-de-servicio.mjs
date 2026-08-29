#!/usr/bin/env node
/**
 * EL CONTRATO DE CADA SERVICIO.
 *
 * QUÉ ES. Un servicio de NELVYON no es una línea en una lista de precios: es la
 * promesa de que alguien va a hacer un trabajo, con un resultado que se puede
 * mirar. Este documento declara, para los 29, las veintitantas cosas que hacen
 * falta para poder prometerlo: qué resultado busca, a quién sirve, qué hay que
 * preguntarle al cliente, quién responde del trabajo, qué agente lo hace, con
 * qué pasos, con qué cuentas, contra qué rúbrica se revisa, qué se mide, qué
 * palancas se pueden mover, qué exige aprobación humana y qué cuesta.
 *
 * DE DÓNDE SALE. TODO se deriva del árbol. Ni un campo se escribe a mano:
 *
 *   catálogo y precio ....... backend/billing/premiumProducts.ts
 *   entradas del cliente .... backend/cerebro/dimensiones.ts
 *   departamento ............ backend/agentes/departamentos.ts
 *   agente y pasos .......... backend/os-agents/agents/*Agent.ts
 *   herramientas ............ backend/herramientas/Herramientas.ts
 *   rúbrica de calidad ...... backend/calidad/MotorDeCalidad.ts
 *   medición y palancas ..... backend/optimizacion/PoliticaDeOptimizacion.ts
 *   conexiones .............. apps/web/src/lib/os-core/connectorRegistry.ts
 *   personalización ......... backend/calidad/personalizacion_por_servicio.json
 *
 * POR QUÉ IMPORTA QUE SEA DERIVADO. Un contrato de servicio escrito a mano se
 * queda obsoleto en la primera semana y nadie se entera, porque nadie lo
 * vuelve a leer entero. Éste se regenera, así que si un servicio pierde su
 * agente o su rúbrica, el documento lo dice al día siguiente en vez de seguir
 * prometiendo lo que ya no hay.
 *
 * LO QUE NO INVENTA. Hay campos del contrato que HOY no tienen fuente en el
 * árbol —el SLA de entrega, por ejemplo—. No se rellenan con una cifra
 * plausible: se listan con su motivo y su clasificación. Un contrato con un
 * hueco declarado es honesto; uno con un hueco relleno es una trampa que se
 * descubre cuando un cliente reclama.
 *
 * USO
 *   node scripts/contrato-de-servicio.mjs
 */
import fs from "node:fs";
import path from "node:path";

import {
  CONECTORES_DE_DISCIPLINA,
  DEPARTAMENTO_DE_SERVICIO,
  QA_DE,
} from "./lib/mapaDeServicio.mjs";

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, "docs", "CONTRATO_DE_SERVICIO.md");

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

// ── El catálogo: los servicios con precio ───────────────────────────────────

const productos = leer("backend/billing/premiumProducts.ts");
const SERVICIOS = [
  ...productos.matchAll(
    /^\s*"?([a-z0-9_]+)"?:\s*\{\s*name:\s*"([^"]+)",\s*amount:\s*([0-9_]+)\s*,?(\s*precioPendiente:\s*true\s*,?)?/gm,
  ),
].map((m) => ({
  id: m[1],
  nombre: m[2],
  importeCents: Number(m[3].replace(/_/g, "")),
  precioPendiente: Boolean(m[4]),
}));

// EL DENOMINADOR SE COMPRUEBA. Este documento vale exactamente lo que valga su
// lista de servicios, y una expresion regular que deja de casar no falla: acaba
// con menos filas y el documento sale igual de bonito. La primera version de
// este script leyo 4 de 29 porque los veinticinco antiguos estan escritos en una
// sola linea y no llevan coma tras el importe.
{
  const ids = leer("backend/os-agents/constants.ts");
  const esperados = [...(/OS_PREMIUM_SERVICE_IDS = \[([\s\S]*?)\] as const/.exec(ids)?.[1] ?? "").matchAll(
    /^\s*"([a-z0-9_]+)",/gm,
  )].map((m) => m[1]);
  const leidos = new Set(SERVICIOS.map((s) => s.id));
  const perdidos = esperados.filter((x) => !leidos.has(x));
  if (perdidos.length > 0 || esperados.length === 0) {
    console.error(
      `
El catalogo no se ha leido entero: faltan ${perdidos.length} de ${esperados.length}.`,
    );
    console.error(`  ${perdidos.join(", ")}`);
    process.exit(1);
  }
}

// ── Dimensiones del cerebro, por servicio ───────────────────────────────────

const dimensiones = new Map();
{
  const t = leer("backend/cerebro/dimensiones.ts");
  for (const bloque of t.split(/\n  \{\n/).slice(1)) {
    const id = /id:\s*"([a-z0-9_]+)"/.exec(bloque)?.[1];
    if (!id) continue;
    const pregunta = /pregunta:\s*"((?:[^"\\]|\\.)*)"/.exec(bloque)?.[1] ?? "";
    const laAporta = /laAporta:\s*"([a-z]+)"/.exec(bloque)?.[1] ?? "";
    const imprescindible = /imprescindible:\s*true/.test(bloque);
    const usos = /serviciosQueLaUsan:\s*\[([^\]]*)\]/.exec(bloque)?.[1] ?? "";
    for (const s of usos.matchAll(/"([a-z0-9_]+)"/g)) {
      const lista = dimensiones.get(s[1]) ?? [];
      lista.push({ id, pregunta, laAporta, imprescindible });
      dimensiones.set(s[1], lista);
    }
  }
}

// ── Política de optimización, por disciplina ────────────────────────────────

const politicaDe = new Map();
{
  const t = leer("backend/optimizacion/PoliticaDeOptimizacion.ts");
  for (const bloque of t.split(/\n  \{\n/).slice(1)) {
    const disciplina = /disciplina:\s*"([a-z0-9_]+)"/.exec(bloque)?.[1];
    if (!disciplina) continue;
    const p = {
      disciplina,
      metricaPrincipal: /metricaPrincipal:\s*"([a-z0-9_]+)"/.exec(bloque)?.[1] ?? "",
      vigilan: [
        ...(/metricasQueVigilan:\s*\[([^\]]*)\]/.exec(bloque)?.[1] ?? "").matchAll(/"([a-z0-9_]+)"/g),
      ].map((m) => m[1]),
      variacionMinimaPct: Number(/variacionMinimaPct:\s*(\d+)/.exec(bloque)?.[1] ?? 0),
      muestraMinima: /muestraMinima:\s*\{\s*que:\s*"([^"]+)",\s*minimo:\s*(\d+)/.exec(bloque),
      caidaPreocupantePct: Number(/caidaPreocupantePct:\s*(\d+)/.exec(bloque)?.[1] ?? 0),
      palancas: [...bloque.matchAll(/\{\s*id:\s*"([a-z0-9_]+)",\s*que:\s*"([^"]+)",\s*consecuencias:\s*\[([^\]]*)\]/g)].map(
        (m) => ({
          id: m[1],
          que: m[2],
          consecuencias: [...m[3].matchAll(/"([a-z0-9_]+)"/g)].map((c) => c[1]),
        }),
      ),
      escalar: [
        ...(/cuandoEscalar:\s*\[([\s\S]*?)\]/.exec(bloque)?.[1] ?? "").matchAll(/"((?:[^"\\]|\\.)*)"/g),
      ].map((m) => m[1]),
    };
    for (const s of (/servicios:\s*\[([^\]]*)\]/.exec(bloque)?.[1] ?? "").matchAll(/"([a-z0-9_]+)"/g)) {
      politicaDe.set(s[1], p);
    }
  }
}

// ── Herramientas, por servicio ──────────────────────────────────────────────

const herramientasDe = new Map();
{
  const t = leer("backend/herramientas/Herramientas.ts");
  for (const m of t.matchAll(
    /\{\s*\n\s*id:\s*"([a-z0-9-]+)",\s*\n\s*que:\s*"([^"]+)",\s*\n\s*servicios:\s*\[([\s\S]*?)\]/g,
  )) {
    for (const s of m[3].matchAll(/"([a-z0-9_]+)"/g)) {
      const lista = herramientasDe.get(s[1]) ?? [];
      lista.push({ id: m[1], que: m[2] });
      herramientasDe.set(s[1], lista);
    }
  }
}

// ── Rúbricas de calidad, por dominio ────────────────────────────────────────

const rubricaDe = new Map();
let comunes = [];
{
  const motor = leer("backend/calidad/MotorDeCalidad.ts");
  const comunesBloque = /const COMUNES: readonly Comprobacion\[\] = \[([\s\S]*?)\n\];/.exec(motor)?.[1] ?? "";
  comunes = [...comunesBloque.matchAll(/id:\s*"([a-z0-9-]+)",\s*\n\s*descripcion:\s*"([^"]+)"/g)].map((m) => ({
    id: m[1],
    descripcion: m[2],
  }));

  const bloque = /const POR_DOMINIO[^=]*= \{([\s\S]*?)\n\};/.exec(motor)?.[1] ?? "";
  for (const dom of [...bloque.matchAll(/^  ([a-z0-9_]+): \[/gm)].map((m) => m[1])) {
    const seg = bloque.split(`\n  ${dom}: [`)[1]?.split("\n  ],")[0] ?? "";
    rubricaDe.set(
      dom,
      [...seg.matchAll(/id:\s*"([a-z0-9-]+)",\s*\n\s*descripcion:\s*"([^"]+)",\s*\n\s*clase:\s*"([a-z]+)",\s*\n\s*gravedad:\s*"([a-z]+)"/g)].map(
        (m) => ({ id: m[1], descripcion: m[2], clase: m[3], gravedad: m[4] }),
      ),
    );
  }
}

// ── Departamentos ───────────────────────────────────────────────────────────

const departamento = new Map();
{
  const t = leer("backend/agentes/departamentos.ts");
  for (const bloque of t.split(/\n  \{\n/).slice(1)) {
    const id = /id:\s*"([a-z0-9_]+)"/.exec(bloque)?.[1];
    if (!id) continue;
    departamento.set(id, {
      id,
      nombre: /nombre:\s*"([^"]+)"/.exec(bloque)?.[1] ?? id,
      responsabilidad: /responsabilidad:\s*\n?\s*"((?:[^"\\]|\\.)*)"/.exec(bloque)?.[1] ?? "",
      estado: /estado:\s*"([a-z]+)"/.exec(bloque)?.[1] ?? "",
      motivoSiPlaneado: /motivoSiPlaneado:\s*\n?\s*"((?:[^"\\]|\\.)*)"/.exec(bloque)?.[1] ?? "",
      kpis: [...(/kpis:\s*\[([^\]]*)\]/.exec(bloque)?.[1] ?? "").matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]),
    });
  }
}

// EL MAPA DE DEPARTAMENTOS SE COMPRUEBA CONTRA EL ARBOL, en las dos direcciones:
// que cubre los 29 servicios y que no nombra un departamento inexistente.
{
  const sinDepartamento = SERVICIOS.filter((s) => !DEPARTAMENTO_DE_SERVICIO[s.id]).map((s) => s.id);
  const inventados = [...new Set(Object.values(DEPARTAMENTO_DE_SERVICIO))].filter(
    (d) => !departamento.has(d),
  );
  if (sinDepartamento.length > 0 || inventados.length > 0) {
    if (sinDepartamento.length > 0) {
      console.error(`Servicios sin departamento asignado: ${sinDepartamento.join(", ")}`);
    }
    if (inventados.length > 0) {
      console.error(`Departamentos que no existen en departamentos.ts: ${inventados.join(", ")}`);
    }
    process.exit(1);
  }
}

// ── Agentes y sus pasos ─────────────────────────────────────────────────────

const agenteDe = new Map();
{
  const dir = path.join(RAIZ, "backend", "os-agents", "agents");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("Agent.ts"))) {
    const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/\r\n/g, "\n");
    const sid = /readonly serviceId = "([a-z0-9_]+)"/.exec(t)?.[1];
    if (!sid) continue;
    // Los pasos se leen por su descripcion, no se cuentan. La primera version
    // exigia `name: S1` y devolvia CERO pasos para los agentes que nombran sus
    // constantes de otra forma (`STEP_BRIEF_ANALYSIS`): dos servicios salian con
    // «0 pasos» en un documento por lo demas correcto.
    const pasos = [...t.matchAll(/name:\s*[A-Za-z_$][\w$]*,\s*\n\s*description:\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    agenteDe.set(sid, { clase: f.replace(/\.ts$/, ""), pasos });
  }
}

// NINGUN AGENTE TIENE CERO PASOS. Si el lector no encuentra ninguno, el fallo es
// del lector: un agente sin pasos no compilaria. Parar aqui evita publicar un
// documento que describe un servicio como vacio cuando no lo esta.
{
  const mudos = [...agenteDe.entries()].filter(([, a]) => a.pasos.length === 0);
  if (mudos.length > 0) {
    console.error(`No se han podido leer los pasos de ${mudos.length} agente(s):`);
    for (const [sid, a] of mudos) console.error(`  ${sid} (${a.clase})`);
    process.exit(1);
  }
}

// ── Conectores ──────────────────────────────────────────────────────────────

const conectoresPorCategoria = new Map();
{
  const t = leer("apps/web/src/lib/os-core/connectorRegistry.ts");
  for (const m of t.matchAll(
    /id:\s*"([a-z0-9-]+)",\s*\n\s*name:\s*"([^"]+)",\s*\n\s*category:\s*"([a-z_-]+)",\s*\n\s*status:\s*"([a-z_]+)"/g,
  )) {
    const lista = conectoresPorCategoria.get(m[3]) ?? [];
    lista.push({ id: m[1], nombre: m[2], estado: m[4] });
    conectoresPorCategoria.set(m[3], lista);
  }
}

// ── Personalización medida ──────────────────────────────────────────────────

const personalizacion = new Map();
for (const s of leerJson("backend/calidad/personalizacion_por_servicio.json")?.servicios ?? []) {
  personalizacion.set(s.servicio, s);
}

// ── Composición ─────────────────────────────────────────────────────────────

/**
 * Campos del contrato que HOY no tienen fuente en el árbol.
 *
 * No se rellenan. Cada uno dice por qué no y de quién depende, con el mismo
 * vocabulario que usa la directiva para clasificar huecos. La diferencia entre
 * un hueco declarado y un hueco relleno es la diferencia entre saber lo que
 * falta y descubrirlo cuando un cliente reclama.
 */
const HUECOS_COMUNES = [
  {
    campo: "SLA de entrega",
    clasificacion: "BUSINESS_DECISION_REQUIRED",
    porQue:
      "un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.",
  },
  {
    campo: "Verificación en producción",
    clasificacion: "PRODUCTION_REQUIRED",
    porQue: "nada se ha desplegado. Todo lo que dice este documento está medido en local.",
  },
];

function contratoDe(s) {
  const dims = dimensiones.get(s.id) ?? [];
  const pol = politicaDe.get(s.id) ?? null;
  const dom = QA_DE[s.id];
  const rub = dom ? (rubricaDe.get(dom) ?? []) : [];
  const dep = departamento.get(DEPARTAMENTO_DE_SERVICIO[s.id]) ?? null;
  const ag = agenteDe.get(s.id) ?? null;
  const her = herramientasDe.get(s.id) ?? [];
  const per = personalizacion.get(s.id) ?? null;
  const cats = pol ? (CONECTORES_DE_DISCIPLINA[pol.disciplina] ?? []) : [];
  const conectores = cats.flatMap((c) => conectoresPorCategoria.get(c) ?? []);

  const huecos = [...HUECOS_COMUNES];
  if (s.precioPendiente) {
    huecos.unshift({
      campo: "Precio",
      clasificacion: "BUSINESS_DECISION_REQUIRED",
      porQue:
        "el servicio es nuevo y nadie ha decidido cuánto vale. Hay un importe puesto para que las estructuras que lo rodean funcionen, y `precioFacturable()` devuelve `null` para que ese importe no llegue nunca a una pasarela.",
    });
  }
  if (dep && dep.estado === "planeado") {
    huecos.push({
      campo: `Departamento responsable (${dep.nombre})`,
      clasificacion: "REAL_PROVIDER_REQUIRED",
      porQue: dep.motivoSiPlaneado || "declarado como planeado sin motivo, lo que ya es un defecto en sí.",
    });
  }
  const palancasBloqueadas = (pol?.palancas ?? []).filter((p) => p.consecuencias.length > 0);

  return { s, dims, pol, dom, rub, dep, ag, her, per, conectores, huecos, palancasBloqueadas };
}

// ── Salida ──────────────────────────────────────────────────────────────────

const euros = (cents) => `${(cents / 100).toLocaleString("es-ES")} €`;
const lista = (xs) => (xs.length > 0 ? xs.join(", ") : "—");

const contratos = SERVICIOS.map(contratoDe);

const out = [];
out.push("# El contrato de cada servicio");
out.push("");
out.push(
  "Generado por `scripts/contrato-de-servicio.mjs`. **No se edita a mano**: cada campo",
  "sale del árbol, así que si un servicio pierde su agente, su rúbrica o su política de",
  "optimización, este documento lo dice en la siguiente ejecución en vez de seguir",
  "prometiendo lo que ya no hay.",
);
out.push("");
out.push(
  `Son **${contratos.length} servicios**. Ninguno está verificado en producción, porque nada se ha`,
  "desplegado: todo lo que aquí se afirma está medido en local.",
);
out.push("");

out.push("## Resumen");
out.push("");
out.push("| Servicio | Departamento | Agente | Pasos | Herramientas | Rúbrica | Métrica que manda | Precio |");
out.push("|---|---|---|---|---|---|---|---|");
for (const c of contratos) {
  const depTxt = c.dep ? `${c.dep.nombre}${c.dep.estado === "planeado" ? " ⚠️" : ""}` : "—";
  out.push(
    `| \`${c.s.id}\` | ${depTxt} | ${c.ag ? "✅" : "❌"} | ${c.ag?.pasos.length ?? 0} | ${c.her.length} | ${c.rub.length} | \`${c.pol?.metricaPrincipal ?? "—"}\` | ${c.s.precioPendiente ? "pendiente" : euros(c.s.importeCents)} |`,
  );
}
out.push("");
out.push("⚠️ = el departamento que responde de ese trabajo está declarado como *planeado*. El");
out.push("servicio se ejecuta igual; lo que falta está dicho en su ficha.");
out.push("");
out.push("---");
out.push("");

for (const c of contratos) {
  const { s, pol, dep, ag } = c;
  out.push(`## \`${s.id}\` — ${s.nombre}`);
  out.push("");

  out.push("**Resultado de negocio.** " + (pol
    ? `Se juzga por \`${pol.metricaPrincipal}\`, vigilando ${lista(pol.vigilan.map((v) => `\`${v}\``))}. Por debajo de un ${pol.variacionMinimaPct} % de variación no se toca nada: sería reaccionar a ruido.`
    : "**Sin política de optimización.** No hay con qué juzgarlo. Es un defecto, no una característica."));
  out.push("");

  out.push("**Quién responde.** " + (dep
    ? `${dep.nombre} — ${dep.responsabilidad} KPIs del departamento: ${lista(dep.kpis)}.${dep.estado === "planeado" ? ` **Estado: planeado.** ${dep.motivoSiPlaneado}` : ""}`
    : "Sin departamento asignado."));
  out.push("");

  out.push("**Qué se le pregunta al cliente.**");
  out.push("");
  const delCliente = c.dims.filter((d) => d.laAporta === "cliente");
  if (delCliente.length === 0) {
    out.push("- Nada propio de este servicio. Trabajará sólo con el contexto común.");
  } else {
    for (const d of delCliente) {
      out.push(`- \`${d.id}\`${d.imprescindible ? " *(imprescindible)*" : ""} — ${d.pregunta}`);
    }
  }
  out.push("");

  const deMedicion = c.dims.filter((d) => d.laAporta === "medicion");
  const deNelvyon = c.dims.filter((d) => d.laAporta === "nelvyon");
  out.push("**Qué se mide y quién lo aporta.**");
  out.push("");
  if (deMedicion.length === 0 && deNelvyon.length === 0) {
    out.push("- Sin dimensiones de medición propias.");
  } else {
    for (const d of [...deMedicion, ...deNelvyon]) {
      out.push(`- \`${d.id}\` *(${d.laAporta === "medicion" ? "lo mide el sistema" : "lo aporta NELVYON"})* — ${d.pregunta}`);
    }
  }
  if (pol?.muestraMinima) {
    out.push(
      `- **Muestra mínima:** ${pol.muestraMinima[2]} ${pol.muestraMinima[1]}. Por debajo de ahí no se concluye: no se sabe.`,
    );
  }
  out.push("");

  out.push("**Cómo se hace el trabajo.**");
  out.push("");
  if (!ag) {
    out.push("- **Sin agente.** El servicio no se puede ejecutar.");
  } else {
    out.push(`Agente \`${ag.clase}\`, ${ag.pasos.length} pasos encadenados:`);
    out.push("");
    ag.pasos.forEach((p, i) => out.push(`${i + 1}. ${p}`));
  }
  out.push("");

  out.push("**Cuentas que hace además de escribir.**");
  out.push("");
  if (c.her.length === 0) {
    out.push("- Ninguna. Es un defecto: un especialista que sólo escribe no es un especialista.");
  } else {
    for (const h of c.her) out.push(`- \`${h.id}\` — ${h.que}`);
  }
  out.push("");

  out.push("**Contra qué se revisa lo que produce.**");
  out.push("");
  if (c.rub.length === 0) {
    out.push(`- Sin rúbrica de dominio${c.dom ? ` (\`${c.dom}\` está vacío)` : ""}. Sólo se le aplican las comunes.`);
  } else {
    out.push(`Rúbrica \`${c.dom}\`, ${c.rub.length} comprobaciones:`);
    out.push("");
    for (const r of c.rub) {
      out.push(`- \`${r.id}\` *(${r.gravedad})* — ${r.descripcion}`);
    }
  }
  out.push("");
  out.push(`Además, las ${comunes.length} comunes a todo entregable: ${lista(comunes.map((x) => `\`${x.id}\``))}.`);
  out.push("");

  out.push("**Personalización, medida ejecutando el agente.** " + (c.per
    ? `Veredicto **${c.per.veredicto}** — cobertura ${c.per.cobertura} (qué parte de lo que distingue al cliente llega a la instrucción), separación ${c.per.separacion} (cuánto de lo que produce es propio de ese cliente y no común a los cinco).`
    : "**No medida.**"));
  out.push("");

  out.push("**Qué se puede mover solo y qué no.**");
  out.push("");
  const solas = (pol?.palancas ?? []).filter((p) => p.consecuencias.length === 0);
  if (solas.length > 0) {
    out.push("Sin aprobación humana, porque no tocan nada fuera:");
    out.push("");
    for (const p of solas) out.push(`- ${p.que}`);
    out.push("");
  }
  if (c.palancasBloqueadas.length > 0) {
    out.push("Con aprobación humana obligatoria:");
    out.push("");
    for (const p of c.palancasBloqueadas) {
      out.push(`- ${p.que} — *toca el mundo real: ${lista(p.consecuencias)}*`);
    }
    out.push("");
  }
  if (solas.length === 0 && c.palancasBloqueadas.length === 0) out.push("- Sin palancas declaradas.");
  out.push("");
  out.push(
    "Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier",
    "caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.",
  );
  out.push("");

  out.push("**Conexiones que le sirven.**");
  out.push("");
  if (c.conectores.length === 0) {
    out.push("- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.");
  } else {
    for (const x of c.conectores) out.push(`- ${x.nombre} \`${x.id}\` — estado \`${x.estado}\``);
  }
  out.push("");

  out.push("**Cuándo deja de intentarlo y habla una persona.**");
  out.push("");
  if ((pol?.escalar ?? []).length === 0) out.push("- Sin criterios de escalado declarados.");
  else for (const e of pol.escalar) out.push(`- ${e}`);
  out.push("");

  out.push("**Coste para el cliente.** " + (s.precioPendiente
    ? "**Sin decidir.** No es facturable."
    : `${euros(s.importeCents)}.`));
  out.push("");

  out.push("**Lo que este contrato todavía no puede declarar.**");
  out.push("");
  for (const h of c.huecos) out.push(`- **${h.campo}** — \`${h.clasificacion}\`. ${h.porQue}`);
  out.push("");
  out.push("---");
  out.push("");
}

out.push("## Lo que este documento NO dice");
out.push("");
out.push(
  "- **Que el trabajo sea bueno.** Dice que hay quien lo hace, con qué pasos, contra qué",
  "  rúbrica se revisa y con qué cifra se juzga. Que el resultado sirva a un cliente real",
  "  no se sabrá hasta que haya un cliente real.",
  "- **Que se haya ejecutado en producción.** Nada se ha desplegado.",
  "- **Que los precios sean los definitivos.** Cuatro están sin decidir y marcados como tales.",
);
out.push("");

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, out.join("\n"), "utf8");

const sinAgente = contratos.filter((c) => !c.ag).length;
const sinPolitica = contratos.filter((c) => !c.pol).length;
const sinHerramientas = contratos.filter((c) => c.her.length === 0).length;
const sinRubrica = contratos.filter((c) => c.rub.length === 0).length;
const depPlaneado = contratos.filter((c) => c.dep?.estado === "planeado").length;

console.log("");
console.log("CONTRATO DE SERVICIO");
console.log(`  ${contratos.length} servicios`);
console.log(`  ${sinAgente} sin agente · ${sinPolitica} sin política · ${sinHerramientas} sin herramientas · ${sinRubrica} sin rúbrica`);
console.log(`  ${depPlaneado} con el departamento responsable todavía planeado`);
console.log("");
console.log(`  escrito en ${path.relative(RAIZ, SALIDA)}`);
console.log("");
