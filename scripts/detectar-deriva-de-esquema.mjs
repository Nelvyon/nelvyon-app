#!/usr/bin/env node
/**
 * BLOQUE 9 · detectar la deriva entre el esquema DECLARADO y el que corre.
 *
 * Las migraciones son la fuente de verdad del esquema. Pero una base lleva años
 * de despliegues, arreglos a mano y migraciones aplicadas a medias, y nadie
 * comprueba nunca si lo que corre es lo que las migraciones dicen.
 *
 * Este script lo comprueba: **reconstruye el esquema desde cero** en una base
 * desechable, y lo compara con el que se le indique. Lo que sobra y lo que
 * falta, con nombres.
 *
 * No es teórico. La primera vez que se ejecutó encontró **13 políticas de RLS**
 * que las migraciones declaran y que la base de certificación no tenía — cuatro
 * de ellas sobre `saas_tenants`, que es la tabla de inquilinos. Nadie lo había
 * visto porque nadie lo había mirado: las pruebas de RLS corrían contra esa base
 * y certificaban las políticas que sí estaban.
 *
 * NO MODIFICA NADA. Ni la base que examina ni las migraciones. Crea una base
 * desechable, la compara y la borra.
 *
 * USO
 *   CERT_PG_CONTAINER=nelvyon-local-ai-postgres \
 *   CERT_PG_USER=nelvyon_local \
 *   DATABASE_URL=postgresql://.../la_base_a_examinar \
 *     node scripts/detectar-deriva-de-esquema.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = path.join(ROOT, "docs", "evidence", "bloque9");
const CONTENEDOR = process.env.CERT_PG_CONTAINER || "nelvyon-local-ai-postgres";
const USUARIO_PG = process.env.CERT_PG_USER || "nelvyon_local";
const REFERENCIA = `nelvyon_deriva_${Date.now()}`;

/**
 * Tablas que NO son producto: las dejan las propias pruebas y los simulacros.
 * Contarlas como deriva sería ruido permanente, y una lista de deriva con ruido
 * permanente deja de leerse.
 */
const NO_SON_PRODUCTO = /^(_nelvyon_|zz_|tmp_|pg_temp)/;

function enContenedor(args) {
  const r = spawnSync("docker", ["exec", CONTENEDOR, ...args], { encoding: "utf8" });
  return { status: r.status ?? 1, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function psql(db, sql) {
  return enContenedor(["psql", "-U", USUARIO_PG, "-d", db, "-tAc", sql.replace(/\s+/g, " ")]);
}

function lista(db, sql) {
  const r = psql(db, sql);
  if (r.status !== 0) throw new Error(`consulta fallida en ${db}: ${r.err.slice(0, 200)}`);
  return r.out ? r.out.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

const CONSULTAS = {
  tablas: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1",
  columnas:
    "SELECT table_name||'.'||column_name||':'||data_type FROM information_schema.columns " +
    "WHERE table_schema='public' ORDER BY 1",
  restricciones:
    "SELECT r.relname||'.'||c.conname FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid " +
    "JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' ORDER BY 1",
  indices: "SELECT tablename||'.'||indexname FROM pg_indexes WHERE schemaname='public' ORDER BY 1",
  politicas_rls:
    "SELECT tablename||'.'||policyname FROM pg_policies WHERE schemaname='public' ORDER BY 1",
};

function main() {
  const objetivo = process.env.DATABASE_URL;
  if (!objetivo) {
    console.error("falta DATABASE_URL: hay que decir QUE base se examina");
    process.exit(2);
  }
  const nombreObjetivo = new URL(objetivo).pathname.replace(/^\//, "");
  fs.mkdirSync(SALIDA, { recursive: true });

  console.log(`objetivo:   ${nombreObjetivo}`);
  console.log(`referencia: ${REFERENCIA} (reconstruida desde las migraciones)\n`);

  // ── Reconstruir la referencia desde cero ──────────────────────────────────
  psql("postgres", `DROP DATABASE IF EXISTS ${REFERENCIA}`);
  const crear = psql("postgres", `CREATE DATABASE ${REFERENCIA}`);
  if (crear.status !== 0) {
    console.error("no se pudo crear la base de referencia:", crear.err.slice(0, 200));
    process.exit(1);
  }

  const url = new URL(objetivo);
  url.pathname = `/${REFERENCIA}`;
  const mig = spawnSync("node", [path.join(ROOT, "scripts", "migrate-pg.mjs")], {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
  const migOk = (mig.stdout || "").includes('"ok": true');
  console.log(`migraciones aplicadas: ${migOk ? "OK" : "FALLARON"}`);
  if (!migOk) {
    console.error((mig.stdout || mig.stderr || "").slice(-1500));
    psql("postgres", `DROP DATABASE IF EXISTS ${REFERENCIA}`);
    process.exit(1);
  }

  // ── Comparar ──────────────────────────────────────────────────────────────
  const informe = { objetivo: nombreObjetivo, referencia: REFERENCIA, categorias: {} };
  let derivaTotal = 0;

  for (const [nombre, sql] of Object.entries(CONSULTAS)) {
    const enObjetivo = new Set(lista(nombreObjetivo, sql).filter((x) => !NO_SON_PRODUCTO.test(x)));
    const enReferencia = new Set(lista(REFERENCIA, sql).filter((x) => !NO_SON_PRODUCTO.test(x)));
    const faltan = [...enReferencia].filter((x) => !enObjetivo.has(x)).sort();
    const sobran = [...enObjetivo].filter((x) => !enReferencia.has(x)).sort();
    informe.categorias[nombre] = {
      en_objetivo: enObjetivo.size,
      en_referencia: enReferencia.size,
      faltan_en_objetivo: faltan,
      sobran_en_objetivo: sobran,
    };
    derivaTotal += faltan.length + sobran.length;
    const marca = faltan.length + sobran.length === 0 ? "=" : "!";
    console.log(
      `${marca} ${nombre.padEnd(16)} objetivo ${String(enObjetivo.size).padStart(5)}  ` +
        `referencia ${String(enReferencia.size).padStart(5)}  ` +
        `faltan ${faltan.length}  sobran ${sobran.length}`,
    );
    for (const x of faltan.slice(0, 20)) console.log(`      FALTA:  ${x}`);
    for (const x of sobran.slice(0, 20)) console.log(`      SOBRA:  ${x}`);
  }

  psql("postgres", `DROP DATABASE IF EXISTS ${REFERENCIA}`);

  informe.deriva_total = derivaTotal;
  informe.decision = derivaTotal === 0 ? "SIN_DERIVA" : "HAY_DERIVA";
  const destino = path.join(SALIDA, `deriva_${nombreObjetivo}.json`);
  fs.writeFileSync(destino, JSON.stringify(informe, null, 2));

  console.log(`\n======== ${informe.decision}: ${derivaTotal} diferencias ========`);
  console.log(`evidencia: ${destino}`);
  process.exit(derivaTotal === 0 ? 0 : 1);
}

/**
 * «No he podido comprobarlo» sale con 2, nunca con 1.
 *
 * Antes, un fallo de conexión —base inexistente, contraseña mala, contenedor
 * parado— se iba por una excepción sin capturar y Node terminaba con **1**, que
 * es exactamente el código que este script usa para decir «HAY DERIVA».
 *
 * Quien lo llame desde un despliegue no podría distinguir «tu esquema ha
 * cambiado» de «no llegué a mirarlo», y las dos cosas exigen reacciones
 * opuestas: la primera es un hallazgo, la segunda es que la comprobación no ha
 * ocurrido y hay que repetirla.
 *
 * Es la misma regla que ya aplica `detectar-colision-de-workspace.mjs`, y la
 * misma que se le exige a una señal de salud: un verde tiene que significar lo
 * que dice, y un rojo también.
 */
try {
  main();
} catch (e) {
  console.error(`NO SE PUEDE COMPROBAR: ${e instanceof Error ? e.message : String(e)}`);
  console.error("No se ha examinado nada. Esto NO significa que no haya deriva.");
  process.exit(2);
}
