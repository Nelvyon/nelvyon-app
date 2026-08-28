#!/usr/bin/env node
/**
 * CARACTERIZAR LOS 1.994 AGENTES SECTORIALES ANTES DE TOCAR NINGUNO.
 *
 * El encargo es explícito: primero characterization tests, después migrar. Sin
 * eso, colapsar 1.994 ficheros es un big-bang a ciegas.
 *
 * LO QUE HAY QUE CARACTERIZAR, y por qué es más simple de lo que parece.
 * Leyendo un agente cualquiera —`AnimacionSEOAgent.ts`— se ve que toda su
 * especialización cabe en cuatro cosas:
 *
 *     const AGENT_ID = "animacion-seo";
 *     const eliteRole = "Eres **Animación SEO** — estudios y VFX.";
 *     const mission   = "Diseña **SEO para estudios de animación**...";
 *     const fewShot   = '{"result":"...","score":92,...}';
 *     return runAnimacionAgentCore(AGENT_ID, llm, { eliteRole, mission, fewShotExample: fewShot }, input);
 *
 * Todo lo demás —el singleton, el getter del LLM, el reset para pruebas— es
 * idéntico entre ficheros. Si eso es cierto para la mayoría, la migración a
 * `AGENTE BASE + PERFIL DE SECTOR` conserva el comportamiento por construcción:
 * el perfil ES el id más las tres cadenas.
 *
 * Esta herramienta EXTRAE esos cuatro datos de cada fichero y los fija en un
 * fichero de referencia. Después de migrar, se vuelve a ejecutar contra la
 * arquitectura nueva y se compara. Si algo cambia, se sabe qué y dónde.
 *
 * Y lo más importante: MARCA LOS QUE NO ENCAJAN. Un fichero cuya forma no es
 * ésta hace algo que los demás no hacen, y migrarlo con la plantilla lo
 * rompería en silencio. Ésos se miran a mano.
 *
 * NO MODIFICA NADA.
 *
 * USO
 *   node scripts/caracterizar-agentes-sectoriales.mjs            # informe
 *   node scripts/caracterizar-agentes-sectoriales.mjs --escribir # fija la referencia
 *   node scripts/caracterizar-agentes-sectoriales.mjs --comparar # compara con ella
 *
 * SALIDA
 *   0  todo coincide con la referencia (o se ha escrito)
 *   1  hay diferencias respecto a la referencia
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = path.join(ROOT, "backend", "os-agents", "sectors");
const REFERENCIA = path.join(ROOT, "backend", "os-agents", "caracterizacion_sectoriales.json");

const ESCRIBIR = process.argv.includes("--escribir");
const COMPARAR = process.argv.includes("--comparar");

function ficheros(dir) {
  const out = [];
  const andar = (d) => {
    let e;
    try {
      e = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const x of e) {
      if (x.name === "node_modules" || x.name === "__tests__") continue;
      const p = path.join(d, x.name);
      if (x.isDirectory()) andar(p);
      else if (/^[A-Z].*Agent\.ts$/.test(x.name)) out.push(p);
    }
  };
  andar(dir);
  return out;
}

/**
 * Saca una cadena declarada como `const nombre = "..."` o con plantilla,
 * incluida la forma partida en varias líneas por el formateador.
 */
function cadena(texto, nombre) {
  const re = new RegExp(
    `const\\s+${nombre}\\s*(?::\\s*[^=]+)?=\\s*((?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)(?:\\s*\\+\\s*(?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`))*)`,
    "s",
  );
  const m = re.exec(texto);
  if (!m) return null;
  // Se concatenan los trozos y se quitan las comillas de cada uno.
  return m[1]
    .split(/\s*\+\s*/)
    .map((t) => t.trim().slice(1, -1))
    .join("");
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

const todos = ficheros(RAIZ);
const perfiles = [];
const rebeldes = [];

for (const f of todos) {
  const texto = fs.readFileSync(f, "utf8");

  const agentId = cadena(texto, "AGENT_ID");
  const eliteRole = cadena(texto, "eliteRole");
  const mission = cadena(texto, "mission");
  const fewShot = cadena(texto, "fewShot") ?? cadena(texto, "fewShotExample");

  // ¿Termina llamando al core compartido de su sector?
  const llamaAlCore = /return\s+run\w*AgentCore\s*\(/.test(texto);
  // ¿Pasa argumentos extra al core? Un quinto argumento es comportamiento
  // propio —una temperatura distinta— y NO se puede perder al migrar.
  const argumentosExtra = /AgentCore\([^)]*input\s*,\s*[^)]+\)/.test(texto);

  // HAY DOS FAMILIAS, no una. Medido sobre el arbol:
  //
  //   "con_prompt"  el fichero declara AGENT_ID y las tres cadenas, y se las
  //                 pasa al core.  (AnimacionSEOAgent y companyia)
  //   "solo_id"     el fichero declara SOLO el AGENT_ID; el core busca el
  //                 prompt por identidad.  (AdsAttributionAgent y companyia)
  //
  // La segunda es aun mas facil de migrar que la primera: su perfil de sector
  // es literalmente el id. Tratarla como "rebelde" habria inflado el numero de
  // ficheros a revisar a mano de 20 a 600, y habria hecho parecer imposible una
  // migracion que no lo es.
  // Y una TERCERA, medida despues: 253 ficheros llevan el prompt entero dentro,
  // construido con una plantilla, y leen contexto del cliente con
  // `ClientProfileService.enrichInput`. Son exactamente los 253 que no encajaban
  // en las otras dos — el numero coincide, no se ha elegido.
  //
  // Esto CORRIGE algo que se afirmo antes en este proyecto: se dijo que ningun
  // agente sectorial leia el contexto del cliente, y salia de buscar
  // `os_clients` en `sectors/`. Estos 253 lo leen, pero de OTRA tabla:
  // `client_profiles`, con 12 campos, indexada por user_id + brand_name.
  //
  // Es decir, NELVYON tiene tres almacenes de contexto de cliente a la vez:
  // `os_clients` (23 campos de texto), `client_profiles` (12) y el cerebro
  // nuevo. El cerebro debe ABSORBER los dos primeros, no convertirse en el
  // tercero.
  const promptEnLinea = /ClientProfileService\.enrichInput/.test(texto);

  const familia = eliteRole && mission
    ? "con_prompt"
    : promptEnLinea
      ? "prompt_en_linea"
      : agentId
        ? "solo_id"
        : null;

  // La familia de prompt en linea NO llama al core compartido: construye y
  // lanza su propia peticion. Exigirselo la marcaria como rebelde.
  if (!familia || (familia !== "prompt_en_linea" && !llamaAlCore)) {
    rebeldes.push({
      fichero: rel(f),
      falta: [
        !agentId && "AGENT_ID",
        !llamaAlCore && "llamada al core",
      ].filter(Boolean),
    });
    continue;
  }

  perfiles.push({
    fichero: rel(f),
    familia,
    agentId,
    // Se guarda el hash de cada cadena, no la cadena: el fichero de referencia
    // pesaría megas y el diff sería ilegible. Lo que importa es si CAMBIA.
    eliteRoleHash: eliteRole
      ? crypto.createHash("sha256").update(eliteRole).digest("hex").slice(0, 12)
      : null,
    missionHash: mission
      ? crypto.createHash("sha256").update(mission).digest("hex").slice(0, 12)
      : null,
    fewShotHash: fewShot
      ? crypto.createHash("sha256").update(fewShot).digest("hex").slice(0, 12)
      : null,
    argumentosExtra,
    // Para los de prompt en linea, lo que hay que conservar es el CUERPO.
    cuerpoHash:
      familia === "prompt_en_linea"
        ? crypto.createHash("sha256").update(texto.replace(/\s+/g, " ")).digest("hex").slice(0, 12)
        : null,
  });
}

perfiles.sort((a, b) => a.fichero.localeCompare(b.fichero));
rebeldes.sort((a, b) => a.fichero.localeCompare(b.fichero));

const doc = {
  _lee_esto: [
    "Caracterizacion de los agentes sectoriales ANTES de migrarlos.",
    "",
    "Toda la especializacion de un agente sectorial cabe en cuatro datos: su",
    "AGENT_ID y tres cadenas (eliteRole, mission, fewShot). Lo demas —el",
    "singleton, el getter del LLM, el reset— es identico entre ficheros.",
    "",
    "Este fichero fija esos cuatro datos por fichero. Despues de migrar a",
    "AGENTE BASE + PERFIL DE SECTOR se vuelve a generar y se compara: si algo",
    "cambia, se sabe que y donde. Una migracion que conserve estos hashes",
    "conserva el comportamiento POR CONSTRUCCION.",
    "",
    "`rebeldes` son los que NO encajan en la forma comun. Hacen algo que los",
    "demas no hacen, y migrarlos con la plantilla los romperia en silencio.",
    "Esos se miran a mano, uno por uno.",
    "",
    "`argumentosExtra` marca los que pasan algo mas al core —una temperatura",
    "distinta, por ejemplo—. Ese comportamiento tampoco se puede perder.",
    "",
    "Se regenera con --escribir, nunca a mano.",
  ],
  total: todos.length,
  encajan: perfiles.length,
  conPrompt: perfiles.filter((p) => p.familia === "con_prompt").length,
  soloId: perfiles.filter((p) => p.familia === "solo_id").length,
  promptEnLinea: perfiles.filter((p) => p.familia === "prompt_en_linea").length,
  rebeldes: rebeldes.length,
  conArgumentosExtra: perfiles.filter((p) => p.argumentosExtra).length,
  perfiles,
  losQueNoEncajan: rebeldes,
};

if (ESCRIBIR) {
  fs.writeFileSync(REFERENCIA, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`Referencia escrita: ${perfiles.length} perfiles, ${rebeldes.length} rebeldes.`);
  process.exit(0);
}

if (COMPARAR) {
  if (!fs.existsSync(REFERENCIA)) {
    console.error("No hay referencia. Genérala primero con --escribir.");
    process.exit(1);
  }
  const previo = JSON.parse(fs.readFileSync(REFERENCIA, "utf8"));
  const antes = new Map(previo.perfiles.map((p) => [p.fichero, p]));
  const ahora = new Map(perfiles.map((p) => [p.fichero, p]));

  const cambiados = [];
  const desaparecidos = [];
  const nuevos = [];

  for (const [f, p] of antes) {
    const q = ahora.get(f);
    if (!q) {
      desaparecidos.push(f);
      continue;
    }
    for (const campo of ["familia", "agentId", "eliteRoleHash", "missionHash", "fewShotHash", "argumentosExtra", "cuerpoHash"]) {
      if (p[campo] !== q[campo]) cambiados.push(`${f} · ${campo}: ${p[campo]} → ${q[campo]}`);
    }
  }
  for (const f of ahora.keys()) if (!antes.has(f)) nuevos.push(f);

  if (cambiados.length === 0 && desaparecidos.length === 0 && nuevos.length === 0) {
    console.log(`OK · ${perfiles.length} perfiles idénticos a la referencia.`);
    process.exit(0);
  }
  console.error("DIFERENCIAS respecto a la referencia:");
  for (const c of cambiados.slice(0, 30)) console.error(`  cambia      ${c}`);
  for (const d of desaparecidos.slice(0, 20)) console.error(`  desaparece  ${d}`);
  for (const n of nuevos.slice(0, 20)) console.error(`  aparece     ${n}`);
  console.error(
    `\n${cambiados.length} cambios, ${desaparecidos.length} desaparecidos, ${nuevos.length} nuevos.`,
  );
  console.error(
    "\nSi la migración era correcta, esto debería estar vacío: el perfil de sector\n" +
      "conserva el id y las tres cadenas. Si no lo está, se ha perdido especialización.",
  );
  process.exit(1);
}

// ── Informe ─────────────────────────────────────────────────────────────────

const pct = (n) => ((n / todos.length) * 100).toFixed(1);

console.log("CARACTERIZACIÓN DE LOS AGENTES SECTORIALES");
console.log("═".repeat(78));
console.log(`  ficheros de agente             ${todos.length}`);
const conPrompt = perfiles.filter((p) => p.familia === "con_prompt").length;
const soloId = perfiles.filter((p) => p.familia === "solo_id").length;
console.log(`  caracterizados                 ${perfiles.length}   (${pct(perfiles.length)} %)`);
console.log(`    familia "con_prompt"         ${conPrompt}   (id + eliteRole + mission + fewShot)`);
console.log(`    familia "solo_id"            ${soloId}   (el core busca el prompt por identidad)`);
const enLinea = perfiles.filter((p) => p.familia === "prompt_en_linea").length;
console.log(`    familia "prompt_en_linea"    ${enLinea}   (prompt dentro + lee client_profiles)`);
console.log(`  NO encajan                     ${rebeldes.length}   (${pct(rebeldes.length)} %)`);
console.log(`  pasan argumentos extra al core ${doc.conArgumentosExtra}`);
console.log("");
console.log("  La forma común es: un AGENT_ID y tres cadenas —eliteRole, mission,");
console.log("  fewShot— que se pasan a `run<Sector>AgentCore`. Todo lo demás es");
console.log("  idéntico entre ficheros.");
console.log("");

// Sólo los que TIENEN id: la familia de prompt en línea no declara ninguno, y
// contarla aquí produciría una alarma falsa de 252 identidades repetidas.
const conId = perfiles.filter((p) => p.agentId);
const ids = new Set(conId.map((p) => p.agentId));
console.log(`  AGENT_ID distintos             ${ids.size}  (de ${conId.length} que declaran uno)`);
const repetidos = conId.length - ids.size;
if (repetidos > 0) {
  console.log(`  AGENT_ID REPETIDOS             ${repetidos}  ← dos agentes con la misma identidad`);
}

const misiones = new Set(perfiles.map((p) => p.missionHash));
const roles = new Set(perfiles.map((p) => p.eliteRoleHash));
console.log(`  misiones distintas             ${misiones.size}`);
console.log(`  roles distintos                ${roles.size}`);
console.log("");
console.log("  Ésa es la especialización real que NO se puede perder al migrar.");

if (rebeldes.length > 0) {
  console.log("");
  console.log("LOS QUE NO ENCAJAN · se miran a mano, uno por uno");
  console.log("─".repeat(78));
  for (const r of rebeldes.slice(0, 15)) {
    console.log(`  ${r.fichero}`);
    console.log(`      falta: ${r.falta.join(", ")}`);
  }
  if (rebeldes.length > 15) console.log(`  ... y ${rebeldes.length - 15} más`);
}

console.log("");
console.log("Para fijar esto como referencia antes de migrar:");
console.log("  node scripts/caracterizar-agentes-sectoriales.mjs --escribir");
