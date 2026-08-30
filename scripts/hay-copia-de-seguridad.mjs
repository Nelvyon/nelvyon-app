#!/usr/bin/env node
/**
 * ¿HAY DE DÓNDE RECUPERAR? **SOLO LECTURA. NO CREA NADA.**
 *
 * LA PREGUNTA. Antes de aplicar 21 migraciones a la base de clientes hay que
 * saber de dónde se saldría si algo va mal. No «¿se puede volver atrás?» en
 * abstracto, sino: ¿existe hoy, dentro de lo que ya se paga, una copia desde la
 * que restaurar, de cuándo es, qué protege, y cuánto se tardaría?
 *
 * LO QUE NO HACE, y es lo importante: **no crea ni una copia, ni un snapshot,
 * ni un volumen, ni nada facturable**. Sólo pregunta a la API de Railway por lo
 * que ya existe. Crear una copia de esta base movería más de un giga por el
 * proxy —tráfico de salida real— y eso no está autorizado.
 *
 * SOBRE EL TOKEN. Se lee del fichero de la CLI de Railway, que ya está en esta
 * máquina porque la sesión está iniciada. No se imprime, no se guarda en ningún
 * sitio y no sale de aquí: se usa para una consulta y se descarta.
 *
 * LAS CLASES DE RESPUESTA, y por qué hay tantas:
 *
 *   VERIFIED_EXISTING_RECOVERY ....... existe una copia, se ve su fecha
 *   AVAILABLE_AT_ZERO_ADDITIONAL_COST  el mecanismo está y no cuesta activarlo
 *   MAY_INCREASE_BILL ................ existe pero usarlo puede facturar
 *   PAID ............................. cuesta
 *   UNKNOWN .......................... la API no lo dice, y eso NO es un no
 *   UNAVAILABLE ...................... se ha preguntado y no hay
 *
 * `UNKNOWN` y `UNAVAILABLE` se separan a propósito. «No lo sé» es una respuesta
 * legítima; «no hay» es una afirmación. Confundirlas llevaría a decir que no
 * existe copia cuando lo único que pasa es que no se ha sabido preguntar — y
 * eso bloquearía un despliegue por una limitación mía, no por un hecho.
 *
 * USO
 *   node scripts/hay-copia-de-seguridad.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG = path.join(os.homedir(), ".railway", "config.json");
const API = "https://backboard.railway.com/graphql/v2";

function token() {
  if (!fs.existsSync(CONFIG)) return null;
  try {
    const c = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
    return c?.user?.token || c?.user?.accessToken || null;
  } catch {
    return null;
  }
}

async function consultar(t, query, variables = {}) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) return { error: `HTTP ${r.status}` };
  if (j.errors) return { error: j.errors.map((e) => e.message).join(" · ") };
  return { data: j.data };
}

const PROYECTO = "f6cf47db-4302-4f19-90c2-4c3d6f3c1d66";

async function main() {
  const t = token();
  if (!t) {
    console.log("estado: UNKNOWN — no hay sesión de Railway en esta máquina.");
    process.exit(0);
  }

  console.log("¿HAY DE DÓNDE RECUPERAR?");
  console.log("modo: SOLO LECTURA · no se crea nada\n");

  // ── los volúmenes ───────────────────────────────────────────────────────
  //
  // Se piden SÓLO los campos que el esquema tiene. La primera versión pidió
  // `type`, `backups` y `service { name }` de golpe y se llevó un error entero:
  // en GraphQL un solo campo inexistente tumba la consulta completa, y el
  // mensaje —«Problem processing request»— no dice cuál. Se preguntó al esquema
  // qué hay de verdad y se añadió campo a campo hasta encontrarlo.
  const ENTORNOS = {
    production: "70884d74-52d3-4a52-bcdb-a86d6f2deef4",
    staging: "54fd69fa-13ea-4d7b-b4a9-506cc9d985dd",
  };

  const instancias = [];
  for (const [entorno, id] of Object.entries(ENTORNOS)) {
    const r = await consultar(
      t,
      `query($id: String!) {
         environment(id: $id) {
           volumeInstances { edges { node {
             id state currentSizeMB sizeMB mountPath serviceId
             volume { id name createdAt }
           } } }
         }
       }`,
      { id },
    );
    if (r.error) {
      console.log(`${entorno}: no consultable (${r.error})`);
      continue;
    }
    for (const e of r.data.environment.volumeInstances.edges) {
      instancias.push({ ...e.node, entorno });
    }
  }

  console.log("── VOLÚMENES ────────────────────────────────────────────────");
  for (const i of instancias) {
    console.log(
      `  ${i.volume?.name ?? "?"} · ${i.entorno} · ` +
        `${i.serviceId ? "atado a un servicio" : "SIN SERVICIO — huérfano"} · ` +
        `${Math.round(i.currentSizeMB)} MB de ${i.sizeMB} · ${i.state} · ${i.mountPath}`,
    );
  }
  console.log("");

  // ── copias: los dos campos que el esquema SÍ expone ─────────────────────
  console.log("── COPIAS DE SEGURIDAD ──────────────────────────────────────");
  let veredicto = "UNKNOWN";
  let detalle = "no se ha podido preguntar.";

  for (const i of instancias) {
    const quien = `${i.volume?.name ?? "?"} · ${i.entorno}`;
    const esLaDeProduccion = i.entorno === "production" && Boolean(i.serviceId);

    const lista = await consultar(
      t,
      `query($id: String!) {
         volumeInstanceBackupList(volumeInstanceId: $id) {
           id name createdAt expiresAt usedMB referencedMB volumeInstanceSizeMB scheduleId
         }
       }`,
      { id: i.id },
    );
    const plan = await consultar(
      t,
      `query($id: String!) {
         volumeInstanceBackupScheduleList(volumeInstanceId: $id) {
           id name kind cron retentionSeconds createdAt
         }
       }`,
      { id: i.id },
    );

    console.log(`  ${quien}${esLaDeProduccion ? "   ← LA QUE DECIDE" : ""}`);
    if (lista.error) {
      console.log(`     copias: no consultable (${lista.error.slice(0, 80)})`);
    } else {
      const cs = lista.data.volumeInstanceBackupList ?? [];
      if (cs.length === 0) {
        console.log("     copias: NINGUNA");
        if (esLaDeProduccion) {
          veredicto = "UNAVAILABLE";
          detalle = "la API responde y devuelve CERO copias del volumen de Postgres de producción.";
        }
      } else {
        const orden = [...cs].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
        const ultima = orden[orden.length - 1];
        const horas = (Date.now() - Date.parse(ultima.createdAt)) / 3_600_000;
        console.log(`     copias: ${cs.length}`);
        console.log(`     más antigua:  ${String(orden[0].createdAt).slice(0, 19)}`);
        console.log(
          `     más reciente: ${String(ultima.createdAt).slice(0, 19)} · ${Math.round(ultima.usedMB ?? 0)} MB` +
            ` · caduca ${String(ultima.expiresAt ?? "sin fecha").slice(0, 19)}`,
        );
        console.log(`     referenciados: ${Math.round(ultima.referencedMB ?? 0)} MB de un volumen de ${Math.round(ultima.volumeInstanceSizeMB ?? 0)} MB`);
        console.log(`     hecha por una programación: ${ultima.scheduleId ? "sí" : "NO — es puntual"}`);
        if (esLaDeProduccion) {
          /**
           * HAY COPIA, Y AUN ASÍ NO ES «ESTOY CUBIERTO».
           *
           * Una copia existente y una recuperación fiable no son lo mismo, y la
           * diferencia decide si se puede migrar tranquilo:
           *
           *   · si NO hay programación, esa copia es una foto suelta. Nada
           *     garantiza que mañana haya otra, y si se restaura se vuelve al
           *     día que se tomó.
           *   · la antigüedad ES el RPO. Restaurar una copia de hace 28 horas
           *     pierde 28 horas de trabajo de clientes reales.
           *
           * Por eso el veredicto no es sólo «hay copia»: lleva pegado desde
           * cuándo y si se repite sola.
           */
          const conProgramacion = Boolean(ultima.scheduleId);
          veredicto = conProgramacion
            ? "VERIFIED_EXISTING_RECOVERY"
            : "VERIFIED_EXISTING_RECOVERY_PERO_PUNTUAL";
          detalle =
            `${cs.length} copia(s) del volumen entero · la última hace ${horas.toFixed(1)} h ` +
            `(RPO = ${horas.toFixed(1)} h: restaurarla perdería ese trabajo) · ` +
            (conProgramacion ? "con programación" : "SIN programación: no se repite sola");
        }
      }
    }
    if (plan.error) {
      console.log(`     programación: no consultable (${plan.error.slice(0, 80)})`);
    } else {
      const ps = plan.data.volumeInstanceBackupScheduleList ?? [];
      if (ps.length === 0) console.log("     programación: NINGUNA — no se hacen copias solas");
      for (const p of ps) {
        const dias = p.retentionSeconds ? (p.retentionSeconds / 86_400).toFixed(0) : "?";
        console.log(`     programación: ${p.kind ?? "?"} · cron «${p.cron ?? "-"}» · retención ${dias} días`);
      }
    }
    console.log("");
  }

  console.log("── VEREDICTO ────────────────────────────────────────────────");
  console.log(`  ${veredicto}`);
  console.log(`  ${detalle}`);
  console.log("");
  if (veredicto === "UNKNOWN") {
    console.log("  UNKNOWN NO ES «NO HAY»: es que no se ha podido saber por esta vía.");
    console.log("  Afirmar que existen copias sin verlas sería justo la suposición que");
    console.log("  no se hace antes de migrar la base de clientes.");
    console.log("");
  }
}

main();
