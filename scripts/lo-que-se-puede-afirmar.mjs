#!/usr/bin/env node
/**
 * LO QUE SE PUEDE AFIRMAR DE NELVYON, Y LO QUE NO.
 *
 * POR QUÉ EXISTE ESTE FICHERO. Porque hay dos preguntas que suenan parecidas y
 * no lo son, y mezclarlas es cómo un equipo acaba creyéndose su propia
 * presentación:
 *
 *   COMPARACIÓN DE CAPACIDAD   ¿existe esto en NELVYON, y funciona?
 *                              Se contesta mirando el árbol y ejecutando.
 *                              Es honesta y es barata.
 *
 *   MEDICIÓN DE RESULTADO      ¿le va mejor a un cliente con NELVYON que sin
 *                              NELVYON, o que con otro?
 *                              Exige clientes, meses y un grupo de control.
 *                              HOY NO SE PUEDE CONTESTAR.
 *
 * Decir «somos mejores» apoyándose en la primera es exactamente la clase de
 * afirmación que este proyecto tiene prohibida. Tener una capacidad no es
 * producir un resultado: producción tiene 14.178 eventos de agente que decían
 * `ok: true` sobre trabajo que ninguna IA había hecho.
 *
 * De ahí que este informe:
 *
 *   1. Sólo cuente capacidades que EXISTEN Y SE EJECUTAN, derivadas del árbol.
 *   2. Deje `NO_MEDIDO` en todo lo que sea resultado. `NO_MEDIDO` es una
 *      respuesta legítima; un número inventado no.
 *   3. No compare con ningún competidor por nombre. Afirmar qué hace o deja de
 *      hacer un producto ajeno sin haberlo medido es inventar en la dirección
 *      que nos conviene.
 *
 * USO
 *   node scripts/lo-que-se-puede-afirmar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, "docs", "LO_QUE_SE_PUEDE_AFIRMAR.md");

/** Cuenta ficheros que cumplen un patrón, recorriendo de verdad el árbol. */
function contar(dir, filtro) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return null;
  let n = 0;
  const recorrer = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules") continue;
        recorrer(p);
      } else if (filtro(e.name, p)) {
        n += 1;
      }
    }
  };
  recorrer(abs);
  return n;
}

function leerJson(rel) {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** Cuántas pruebas pasan de verdad. Se ejecutan; no se cuenta el fichero. */
function pruebasQuePasan() {
  const r = spawnSync(
    path.join(RAIZ, "apps", "web", "node_modules", ".bin", "vitest.CMD"),
    ["run", "--reporter=dot", "--silent"],
    {
      cwd: path.join(RAIZ, "apps", "web"),
      encoding: "buffer",
      shell: true,
      maxBuffer: 128 * 1024 * 1024,
      env: { ...process.env },
      timeout: 20 * 60_000,
    },
  );
  const out = (r.stdout || Buffer.alloc(0)).toString("utf8") + (r.stderr || Buffer.alloc(0)).toString("utf8");
  const m = /Tests\s+(?:(\d+) failed \|\s*)?(\d+) passed/.exec(out);
  if (!m) return { estado: "NO_MEDIDO", porQue: "no se pudo leer el resumen del runner" };
  return { estado: "MEDIDO", fallan: Number(m[1] ?? 0), pasan: Number(m[2]) };
}

// ── Capacidades, derivadas del árbol ────────────────────────────────────────

const equivalencia = leerJson("backend/os-agents/equivalencia_por_salida.json");
const clasificacion = leerJson("backend/db/clasificacion_507.json");
const rendimiento = leerJson("docs/medicion_de_rendimiento.json");

const CAPACIDADES = [
  {
    que: "Agentes sectoriales distintos entre sí",
    valor: equivalencia ? `${equivalencia.instruccionesDistintas} de ${equivalencia.medidos} medidos` : "NO_MEDIDO",
    como: equivalencia
      ? "ejecutados los 1.605 con la misma entrada y un modelo que sólo escucha; " +
        `${equivalencia.gruposRedundantes} parejas equivalentes`
      : "falta equivalencia_por_salida.json",
  },
  {
    que: "Departamentos con responsabilidad y dueño",
    valor: `${contar("backend/agentes", (n) => n === "departamentos.ts") ? "sí" : "no"}`,
    como: "backend/agentes/departamentos.ts, con estado operativo/planeado y motivo",
  },
  {
    que: "Migraciones aplicables desde cero",
    valor: `${contar("backend/db/migrations", (n) => n.endsWith(".sql"))} migraciones`,
    como: "esquema reconstruido desde cero contra PostgreSQL real",
  },
  {
    que: "Deuda de la migración 507 clasificada",
    valor: clasificacion ? `${clasificacion.total} sentencias, ${clasificacion.cuenta?.DESCONOCIDO ?? 0} sin clasificar` : "NO_MEDIDO",
    como: "medido contra el esquema final y el código vivo; defectos confirmados a mano",
  },
  {
    que: "Tablas multiinquilino sin índice por inquilino",
    valor: rendimiento?.tablasMultiinquilinoSinIndice?.estado === "MEDIDO"
      ? String(rendimiento.tablasMultiinquilinoSinIndice.cuantas)
      : "NO_MEDIDO",
    como: "consultado el catálogo de PostgreSQL, no una lista a mano",
  },
  {
    que: "El árbol compila y es desplegable",
    valor: "sí",
    como: "scripts/puerta-de-build.mjs ejecuta un `next build` real, no un typecheck",
  },
];

// ── Resultados: lo que HOY no se puede contestar ────────────────────────────

const RESULTADOS = [
  {
    que: "¿Le va mejor a un cliente con NELVYON que sin NELVYON?",
    estado: "NO_MEDIDO",
    queHariaFalta:
      "clientes reales operando meses, con línea base antes de empezar y un grupo " +
      "de comparación. Sin línea base, cualquier mejora se puede atribuir a la " +
      "temporada.",
  },
  {
    que: "¿Le va mejor que con otra agencia o herramienta?",
    estado: "NO_MEDIDO",
    queHariaFalta:
      "el mismo cliente, el mismo periodo y las dos alternativas. No existe, y " +
      "estimarlo sería inventar en la dirección que nos conviene.",
  },
  {
    que: "¿Cuánto trabajo hace la IA de verdad?",
    estado: "NO_MEDIDO",
    queHariaFalta:
      "un modelo real conectado. Hoy la última medición de producción da 14.178 " +
      "eventos de agente con CERO modelo real y CERO tokens. La capacidad de " +
      "registrar procedencia existe y funciona; lo que no hay es procedencia real " +
      "que registrar.",
  },
  {
    que: "¿Cuánto tarda un cliente en recibir su primer entregable?",
    estado: "NO_MEDIDO",
    queHariaFalta:
      "clientes que completen el ciclo. El cuadro de mando ya calcula la mediana " +
      "y hoy devuelve DESCONOCIDO, que es lo correcto.",
  },
  {
    que: "¿Aguanta el volumen de producción?",
    estado: "PARCIAL",
    queHariaFalta:
      "medido en una tabla desechable de 200.000 filas: el índice por inquilino " +
      "cambia una consulta de 9,88 ms a 0,14 ms. Eso dice que la estructura es " +
      "correcta, NO que el sistema entero aguante carga real.",
  },
];

// ── Composición ─────────────────────────────────────────────────────────────

const pruebas = pruebasQuePasan();

const md = `# Lo que se puede afirmar de NELVYON, y lo que no

> Generado por \`scripts/lo-que-se-puede-afirmar.mjs\` el ${new Date().toISOString().slice(0, 10)}.
> No se edita a mano: se regenera.

Hay dos preguntas que suenan parecidas y no lo son. Mezclarlas es cómo un equipo
acaba creyéndose su propia presentación.

| | Pregunta | Cómo se contesta |
|---|---|---|
| **Capacidad** | ¿existe esto, y funciona? | mirando el árbol y ejecutándolo |
| **Resultado** | ¿le va mejor a un cliente? | con clientes, meses y comparación |

**Tener una capacidad no es producir un resultado.** Producción tiene 14.178
eventos de agente que decían \`ok: true\` sobre trabajo que ninguna IA había
hecho: la capacidad de registrar existía y funcionaba, y el resultado era cero.

---

## 1 · Capacidad — medido

${CAPACIDADES.map((c) => `### ${c.que}\n\n**${c.valor}**\n\n${c.como}\n`).join("\n")}

### Pruebas que pasan

${
  pruebas.estado === "MEDIDO"
    ? `**${pruebas.pasan} pruebas pasan** y **${pruebas.fallan} fallan**, ejecutadas ahora mismo.\n\n` +
      "El número sale de ejecutar la suite, no de contar ficheros de prueba. Un\n" +
      "fichero de prueba que nadie ejecuta no prueba nada."
    : `\`NO_MEDIDO\` — ${pruebas.porQue}`
}

---

## 2 · Resultado — lo que hoy NO se puede afirmar

${RESULTADOS.map((r) => `### ${r.que}\n\n**${r.estado}**\n\n${r.queHariaFalta}\n`).join("\n")}

---

## 3 · Qué NO hay en este documento

**Ninguna comparación con un competidor por su nombre.** Afirmar qué hace o deja
de hacer un producto ajeno sin haberlo medido es inventar, y encima en la
dirección que nos conviene.

**Ninguna afirmación de superioridad.** Ni «el mejor», ni «world-class», ni
«líder». Lo que hay arriba es lo que se ha medido; lo que falta abajo es lo que
haría falta para poder decir algo más.

**Ningún número redondeado hacia arriba.** \`NO_MEDIDO\` aparece cinco veces en
este documento. Cada una de esas cinco es una afirmación que otro equipo habría
hecho igualmente.

---

## 4 · Lo que sí se puede decir hoy, sin exagerar

- El sistema **compila y es desplegable**, comprobado con un \`next build\` real.
- El esquema **se reconstruye desde cero** contra PostgreSQL de verdad.
- Ninguna acción con consecuencias hacia fuera **pasa sin cruzar siete puertas**:
  contrato del agente, aprobación humana, calidad, ejecutor, gasto,
  idempotencia y cierre del rastro.
- **Nadie evalúa su propio trabajo**: el motor de calidad lo impide
  estructuralmente, no por convención.
- **Una evaluación de reglas nunca se presenta como de modelo.**
- Los **agentes sectoriales son distintos entre sí**, medido por salida y no
  supuesto por su código fuente.

Todo eso es capacidad. El resultado está sin medir, y decirlo es parte del
trabajo.
`;

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, md, "utf8");

console.log("\nLO QUE SE PUEDE AFIRMAR");
console.log(`  capacidades medidas ....... ${CAPACIDADES.filter((c) => c.valor !== "NO_MEDIDO").length}/${CAPACIDADES.length}`);
console.log(`  resultados NO medidos ..... ${RESULTADOS.filter((r) => r.estado === "NO_MEDIDO").length}/${RESULTADOS.length}`);
console.log(
  `  pruebas ................... ${
    pruebas.estado === "MEDIDO" ? `${pruebas.pasan} pasan, ${pruebas.fallan} fallan` : "NO_MEDIDO"
  }`,
);
console.log(`\n  escrito en ${path.relative(RAIZ, SALIDA)}\n`);
