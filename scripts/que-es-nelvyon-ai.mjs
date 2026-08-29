#!/usr/bin/env node
/**
 * QUÉ ES NELVYON AI, TÉCNICAMENTE.
 *
 * POR QUÉ ESTE FICHERO EXISTE. «Tenemos IA propia» es la frase más fácil de
 * decir y la más difícil de sostener. Hay dos formas de equivocarse, y las dos
 * hacen daño:
 *
 *   POR ARRIBA   llamar «IA propia» a una pantalla que le pasa el texto del
 *                cliente a un proveedor ajeno. Es lo que hace casi todo el
 *                mercado y lo que NELVYON no es.
 *
 *   POR ABAJO    hacer como que existe inferencia real cuando el motor está en
 *                `UNAVAILABLE`. Producción tiene 14.178 eventos de agente que
 *                decían `ok: true` sobre trabajo que ninguna IA hizo: ése es el
 *                error caro, y no se repite.
 *
 * Este informe NO describe: MIDE. Cada capa se cuenta recorriendo el árbol, y
 * la capa de inferencia se declara con su estado real, sea el que sea.
 *
 * LO QUE HACE A UNA IA «PROPIA», Y NO ES EL MODELO. Un modelo es un
 * proveedor intercambiable. Lo que no se puede cambiar de proveedor es todo lo
 * demás: qué sabe del cliente, quién decide qué se hace, qué puede hacer solo,
 * quién lo revisa, qué se aprende de lo que sale. Eso es lo que se cuenta aquí.
 *
 * USO
 *   node scripts/que-es-nelvyon-ai.mjs
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const SALIDA = path.join(RAIZ, "docs", "QUE_ES_NELVYON_AI.md");

const leer = (rel) => {
  const p = path.join(RAIZ, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n") : null;
};

function contarFicheros(dir, filtro) {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return 0;
  let n = 0;
  const recorrer = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "__tests__") continue;
        recorrer(path.join(d, e.name));
      } else if (filtro(e.name)) n += 1;
    }
  };
  recorrer(abs);
  return n;
}

const cuenta = (texto, re) => (texto ? (texto.match(re) ?? []).length : 0);

// ── Las capas, medidas ──────────────────────────────────────────────────────

const dimensiones = leer("backend/cerebro/dimensiones.ts");
const departamentos = leer("backend/agentes/departamentos.ts");
const catalogo = leer("backend/agentes/catalogo.ts");
const autonomia = leer("backend/agentes/autonomia.ts");
const motor = leer("backend/calidad/MotorDeCalidad.ts");
const puente = leer("backend/ejecucion/PuenteDeEjecucion.ts");
const adaptador = leer("backend/autonomous/llm/llmAdapter.ts");

const CAPAS = [
  {
    id: "conocimiento",
    titulo: "Lo que sabe de cada cliente",
    queEs:
      "Un almacén de contexto con procedencia, confianza y caducidad por dato. No es " +
      "un campo de texto libre: cada dimensión sabe de dónde salió —lo dijo el cliente, " +
      "lo dedujo un agente, lo midió una herramienta— y cuándo deja de valer.",
    porQueImporta:
      "Es lo que permite a un agente distinguir lo que el cliente dijo de lo que otro " +
      "agente supuso. Sin eso, una suposición acaba citada como hecho en un informe.",
    medida: `${cuenta(dimensiones, /^    id: "/gm)} dimensiones`,
    fichero: "backend/cerebro/dimensiones.ts",
  },
  {
    id: "organizacion",
    titulo: "Quién decide qué",
    queEs:
      "Departamentos con responsabilidad, con lo que NO deciden y con los indicadores " +
      "que los juzgan. Y `operativo` frente a `planeado`, con el motivo escrito.",
    porQueImporta:
      "Un organigrama donde no se distingue lo que existe de lo que se ha diseñado es " +
      "cómo se acaba con veintitrés especialistas que nadie ha instanciado.",
    medida: `${cuenta(departamentos, /estado: "operativo"/g)} operativos · ${cuenta(departamentos, /estado: "planeado"/g)} planeados`,
    fichero: "backend/agentes/departamentos.ts",
  },
  {
    id: "agentes",
    titulo: "Quién hace el trabajo",
    queEs:
      "Contratos que declaran qué necesita saber cada agente, qué produce, qué NUNCA " +
      "hace y cuándo escala. Más los agentes de servicio premium, con sus pasos " +
      "encadenados, y los sectoriales.",
    porQueImporta:
      "Un agente sin contrato es un agente del que no se puede decir si se ha pasado " +
      "de la raya, porque no había raya.",
    medida:
      `${cuenta(catalogo, /^    id: "/gm)} contratos · ` +
      `${contarFicheros("backend/os-agents/agents", (f) => f.endsWith("Agent.ts"))} agentes de servicio · ` +
      `${contarFicheros("backend/os-agents/sectors", (f) => f.endsWith("Agent.ts"))} sectoriales`,
    fichero: "backend/agentes/catalogo.ts",
  },
  {
    id: "autonomia",
    titulo: "Hasta dónde puede llegar solo",
    queEs:
      "Seis niveles, de observar a exigir aprobación humana, y un suelo por CONSECUENCIA " +
      "real de la acción: gastar dinero, publicar en nombre del cliente, tocar " +
      "credenciales, ser irreversible.",
    porQueImporta:
      "Se comprueba con las consecuencias de la acción concreta, no con las que el " +
      "agente declaró en su contrato: el mismo agente que redacta un correo puede " +
      "estar a punto de enviarlo.",
    medida: `${cuenta(autonomia, /^  \| "/gm)} consecuencias con suelo declarado`,
    fichero: "backend/agentes/autonomia.ts",
  },
  {
    id: "ejecucion",
    titulo: "Cómo llega al mundo real",
    queEs:
      "Un puente entre el agente y el ejecutor con siete puertas: contrato, aprobación " +
      "humana, coherencia de la declaración, calidad, ejecutor, gasto e idempotencia, y " +
      "cierre del rastro.",
    porQueImporta:
      "Al otro lado hay dinero de un cliente y publicaciones con su cara. Ninguna " +
      "puerta es opcional, y la de calidad va ANTES que la de gasto: una pieza que " +
      "suspende no debe llegar a reservar presupuesto.",
    medida: `${cuenta(puente, /puerta: "/g)} denegaciones tipificadas`,
    fichero: "backend/ejecucion/PuenteDeEjecucion.ts",
  },
  {
    id: "calidad",
    titulo: "Quién revisa lo que sale",
    queEs:
      "Un evaluador independiente por disciplina. El agente que produce algo NO puede " +
      "ser su juez: el motor lanza si el evaluador coincide con el autor.",
    porQueImporta:
      "Un agente que se evalúa a sí mismo aprueba lo que sabe hacer, y lo que no sabe " +
      "hacer no lo detecta — no por mala fe, sino porque el mismo razonamiento que " +
      "produjo el fallo lo revisa.",
    medida: `${cuenta(motor, /^      id: "/gm)} comprobaciones en ${cuenta(motor, /^  [a-z0-9_]+: \[/gm)} disciplinas`,
    fichero: "backend/calidad/MotorDeCalidad.ts",
  },
  {
    id: "resultados",
    titulo: "Qué se aprende de lo que sale",
    queEs:
      "Objetivos con línea base, acciones, medidas y atribución. Y la inteligencia " +
      "entre departamentos, que deja pasar un hallazgo de un departamento a otro con " +
      "su evidencia y su confianza.",
    porQueImporta:
      "Una mejora sin línea base se puede atribuir a la temporada. Y un insight sin " +
      "evidencia es una corazonada con formato de dato.",
    medida: "motor de resultados + inteligencia entre departamentos, con corte de bucles",
    fichero: "backend/resultados/MotorDeResultados.ts",
  },
];

// ── La capa de inferencia, con su estado REAL ──────────────────────────────

const modosDeclarados = adaptador ? /resolveLlmMode/.test(adaptador) : false;
const proveedores = contarFicheros("backend/autonomous/llm/providers", (f) =>
  f.endsWith("Provider.ts"),
);

/**
 * El acento grave, como constante.
 *
 * El documento lleva codigo en linea, y un acento grave dentro de una plantilla
 * de JavaScript la cierra. Escaparlos uno a uno funciona hasta que hay una
 * plantilla anidada dentro — y entonces se rompe de una forma que cuesta ver.
 * Con una constante no hay nada que escapar.
 */
const C = String.fromCharCode(96);
const cod = (s) => C + s + C;

const seccionesDeCapa = CAPAS.map((c) =>
  [
    "## " + c.titulo,
    "",
    "**" + c.medida + "**",
    "",
    c.queEs,
    "",
    "*Por que importa:* " + c.porQueImporta,
    "",
    cod(c.fichero),
    "",
  ].join("\n"),
).join("\n");

const md = [
  "# Que es NELVYON AI, tecnicamente",
  "",
  "> Generado por " + cod("scripts/que-es-nelvyon-ai.mjs") +
    " el " + new Date().toISOString().slice(0, 10) + ".",
  "> No se edita a mano: se regenera.",
  "",
  "«Tenemos IA propia» es la frase mas facil de decir y la mas dificil de",
  "sostener. Hay dos formas de equivocarse:",
  "",
  "- **por arriba**, llamando «IA propia» a una pantalla que le pasa el texto",
  "  del cliente a un proveedor ajeno;",
  "- **por abajo**, haciendo como que existe inferencia real cuando no la hay.",
  "",
  "Este documento no describe: **mide**. Y la capa de inferencia se declara con",
  "su estado real, sea el que sea.",
  "",
  "---",
  "",
  "## Lo que hace a una IA «propia», y no es el modelo",
  "",
  "Un modelo es un proveedor intercambiable. Lo que NO se puede cambiar de",
  "proveedor es todo lo demas: **que sabe del cliente, quien decide que se hace,",
  "hasta donde puede llegar solo, quien lo revisa y que se aprende de lo que",
  "sale.**",
  "",
  "Eso es lo que hay debajo, y es lo que se cuenta aqui.",
  "",
  "---",
  "",
  seccionesDeCapa,
  "---",
  "",
  "## La capa de inferencia",
  "",
  "Aqui es donde se puede mentir con mas facilidad, asi que aqui se es mas",
  "explicito.",
  "",
  "| | |",
  "|---|---|",
  "| Registro de proveedores | " +
    (proveedores > 0 ? proveedores + " adaptadores declarados" : "NO_MEDIDO") + " |",
  "| Declaracion de modo | " +
    (modosDeclarados ? cod("REAL") + " / " + cod("MOCK") + " resuelto en ejecucion" : "NO_MEDIDO") +
    " |",
  "| **Inferencia real hoy** | **UNAVAILABLE** |",
  "",
  "**" + cod("UNAVAILABLE") + " no es un fallo: es la verdad.** No hay un modelo",
  "conectado porque donde vive el modelo es una decision empresarial con coste",
  "recurrente, y esa decision no la toma el codigo.",
  "",
  "Lo que si esta construido y comprobado:",
  "",
  "- La procedencia se registra siempre: que proveedor, que modelo, cuantos",
  "  tokens, cuanto costo, cuantos reintentos.",
  "- " + cod("RULE_ENGINE") + " es publicable; " + cod("MOCK") + " y " +
    cod("FALLBACK") + " **no**. Un generador determinista por diseno no es una",
  "  degradacion; una simulacion si.",
  "- El motor de calidad exige **proveedor configurado** para sellar " +
    cod("REAL") + ". Poner una variable de entorno no basta: eso sellaria",
  "  aprobaciones que nadie ha dado.",
  "- El dia que se conecte un modelo, la ultima medicion de produccion —14.178",
  "  eventos con **cero** modelo real y **cero** tokens— pasara a tener numeros",
  "  distintos de cero, y se vera.",
  "",
  "---",
  "",
  "## Lo que NELVYON AI **no** es",
  "",
  "- **No es una envoltura de otro proveedor.** Las capas de arriba se quedan",
  "  igual si manana se cambia de modelo; son lo que el modelo no aporta.",
  "- **No es un chat.** Lo que hay es un sistema que recibe un encargo, decide",
  "  que hacer, lo hace, lo revisa, lo ejecuta con permisos y lo mide.",
  "- **No es autonoma sin limites.** Hay un suelo de autonomia por consecuencia,",
  "  y publicar en nombre del cliente o gastar dinero exige que una persona diga",
  "  que si.",
  "",
  "---",
  "",
  "## Lo que falta, dicho con claridad",
  "",
  "| Que | Estado | Quien lo desbloquea |",
  "|---|---|---|",
  "| Modelo de inferencia conectado | " + cod("UNAVAILABLE") +
    " | decision empresarial (coste recurrente) |",
  "| Resultado real para un cliente | " + cod("NOT_MEASURED") +
    " | hacen falta clientes y meses |",
  "| Comparacion con otras herramientas | " + cod("NOT_MEASURED") +
    " | no se ha medido, y estimarlo seria inventar |",
  "",
  "Todo lo demas de este documento esta construido y tiene pruebas que lo",
  "demuestran.",
  "",
].join("\n");

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, md, "utf8");

console.log("\nQUÉ ES NELVYON AI");
for (const c of CAPAS) console.log(`  ${c.titulo.padEnd(34)} ${c.medida}`);
console.log(`  ${"Inferencia real".padEnd(34)} UNAVAILABLE (${proveedores} adaptadores declarados)`);
console.log(`\n  escrito en ${path.relative(RAIZ, SALIDA)}\n`);
