#!/usr/bin/env node
/**
 * LOS TRABAJOS PARADOS EN LA COLA. **NO EJECUTA NINGUNO. NO ESCRIBE NADA.**
 *
 * QUÉ SON. Doce trabajos llevan encolados desde junio. Nadie los ha ejecutado y
 * nadie los ha cancelado: están ahí, y cada uno pertenece a un cliente que en su
 * día pidió algo.
 *
 * POR QUÉ NO SE EJECUTAN Y YA. Un trabajo de hace dos meses no es un trabajo
 * pendiente: es un trabajo cuyo contexto probablemente ya no existe. El
 * presupuesto pudo cambiar, la campaña pudo lanzarse por otro lado, el cliente
 * pudo irse. Ejecutarlo puede publicar algo en nombre de alguien que ya no
 * espera nada, o gastar dinero que nadie ha vuelto a autorizar.
 *
 * Y hay una razón más simple: **ejecutar los doce cuesta dinero de verdad** si
 * alguno llega a la parte de gasto. Bajo `ZERO_ADDITIONAL_COST_MODE` eso no se
 * hace, y punto.
 *
 * QUÉ HACE ESTO. Los mira y los clasifica, para que la decisión de qué hacer
 * con ellos se tome sabiendo qué son:
 *
 *   SAFE_TO_RESUME ................. el servicio no toca nada de fuera
 *   STALE .......................... tan viejo que su contexto ya no vale
 *   REQUIRES_CLIENT_RECONFIRMATION . habría que preguntarle al cliente
 *   REQUIRES_DANIEL ................ decisión de negocio o gasto
 *   DANGEROUS_TO_RESUME ............ publica, envía o gasta
 *
 * PRIVACIDAD. No imprime correos, ni nombres de cliente, ni el contenido del
 * encargo. De cada trabajo sale su servicio, su antigüedad, y qué haría si se
 * ejecutara. El identificador de inquilino se acorta.
 *
 * COSTE. Lee doce filas. FREE_WITHIN_EXISTING_PLAN.
 *
 * USO
 *   DATABASE_URL="<...>" node scripts/los-doce-trabajos-parados.mjs
 */
import path from "node:path";
import { createRequire } from "node:module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "backend", "db", "package.json"));
const pg = require("pg");

/**
 * Qué toca cada servicio si se ejecuta hasta el final.
 *
 * Se deriva de las consecuencias que declaran las palancas de su disciplina en
 * `PoliticaDeOptimizacion`. Aquí se resume a lo que decide: si el servicio
 * puede acabar publicando, escribiendo a una persona o gastando.
 */
const LO_QUE_TOCA = {
  ads_premium: ["gasta_dinero", "publica_en_nombre_del_cliente"],
  social_media_premium: ["publica_en_nombre_del_cliente"],
  influencer_marketing_premium: ["publica_en_nombre_del_cliente", "contacta_personas"],
  email_marketing_premium: ["contacta_personas"],
  crm_captacion_premium: ["contacta_personas"],
  reputacion_online_orm_premium: ["publica_en_nombre_del_cliente"],
  canales_comunicaciones_premium: ["contacta_personas"],
  bots_premium: ["contacta_personas"],
  voz_premium: ["contacta_personas"],
  personal_digital_premium: ["publica_en_nombre_del_cliente"],
};

/** Cuántos días tiene que pasar un encargo para que su contexto sea sospechoso. */
const DIAS_PARA_SER_VIEJO = 30;

function clasificar(servicio, dias, { traeEncargo, tieneInquilino }) {
  const toca = LO_QUE_TOCA[servicio] ?? [];

  /**
   * PRIMERO LO QUE DECIDE ANTES QUE NADA: si no hay a quién servir ni qué
   * hacer, da igual lo peligroso que sea el servicio.
   *
   * Un trabajo sin inquilino y sin encargo no es trabajo de un cliente
   * esperando: es un resto. Reanudarlo produciria un entregable para nadie,
   * hecho a partir de nada. La pregunta «¿lo ejecutamos?» ni siquiera aplica.
   */
  if (!tieneInquilino && !traeEncargo) {
    return {
      estado: "HUERFANO_SIN_ENCARGO",
      porQue: "no tiene inquilino ni datos del encargo: no hay para quién ni con qué",
    };
  }
  if (!traeEncargo) {
    return {
      estado: "STALE",
      porQue: "tiene inquilino pero el encargo esta vacio: no hay con que trabajar",
    };
  }
  if (toca.includes("gasta_dinero")) {
    return { estado: "REQUIRES_DANIEL", porQue: "puede acabar gastando dinero de un cliente" };
  }
  if (toca.includes("publica_en_nombre_del_cliente") || toca.includes("contacta_personas")) {
    return {
      estado: "DANGEROUS_TO_RESUME",
      porQue: `saldría hacia fuera en nombre del cliente (${toca.join(", ")}) con un encargo de hace ${dias} días`,
    };
  }
  if (dias > DIAS_PARA_SER_VIEJO) {
    return {
      estado: "REQUIRES_CLIENT_RECONFIRMATION",
      porQue: `no toca nada de fuera, pero el encargo tiene ${dias} días y su contexto pudo cambiar`,
    };
  }
  return { estado: "SAFE_TO_RESUME", porQue: "no toca nada de fuera y el encargo es reciente" };
}

async function main() {
  const dsn = (process.env.DATABASE_URL ?? "").trim();
  if (!dsn) {
    console.error("FALTA DATABASE_URL. No se ha consultado nada.");
    process.exit(2);
  }
  /**
   * El proxy TCP de Railway rechaza conexiones de vez en cuando.
   *
   * Se reintenta tres veces con espera creciente. NO es tapar un problema: no
   * hay nada que arreglar en nuestro lado, y un informe que a veces sale y a
   * veces no obliga a repetirlo a mano, que es cuando se deja de mirar.
   */
  const conReintento = async (fn) => {
    let ultimo;
    for (let i = 0; i < 3; i += 1) {
      try {
        return await fn();
      } catch (e) {
        ultimo = e;
        if (!/ETIMEDOUT|ECONNRESET|ECONNREFUSED/.test(String(e.message))) throw e;
        console.error(`  (reintento ${i + 1}/3 tras ${e.code ?? e.message})`);
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
    throw ultimo;
  };

  const pool = new pg.Pool({
    connectionString: dsn,
    max: 2,
    connectionTimeoutMillis: 25_000,
    options: "-c default_transaction_read_only=on",
  });

  try {
    const filas = (
      await conReintento(() => pool.query(`
        SELECT job_id, service_id, status,
               created_at::date::text                                   AS creado,
               EXTRACT(DAY FROM (NOW() - created_at))::int              AS dias,
               left(coalesce(tenant_id::text, '?'), 8)                  AS inquilino,
               left(coalesce(client_id::text, '?'), 8)                  AS cliente,
               coalesce(jsonb_array_length(steps), 0)                   AS pasos,
               (payload IS NOT NULL AND payload::text <> '{}')          AS trae_encargo,
               progress
          FROM os_jobs
         WHERE status IN ('queued', 'running')
         ORDER BY created_at ASC`))
    ).rows;

    console.log(`objetivo: ${new URL(dsn).hostname}`);
    console.log("modo:     SOLO LECTURA · NO SE EJECUTA NINGUNO\n");
    console.log(`trabajos parados: ${filas.length}\n`);

    const cuenta = {};
    for (const f of filas) {
      const c = clasificar(f.service_id, f.dias, {
        traeEncargo: f.trae_encargo,
        tieneInquilino: f.inquilino !== "?",
      });
      cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1;
      console.log(`  ${f.service_id}`);
      console.log(
        `     encolado:  ${f.creado} (${f.dias} días) · inquilino ${f.inquilino === "?" ? "NINGUNO" : f.inquilino + "…"}` +
          ` · cliente ${f.cliente === "?" ? "NINGUNO" : f.cliente + "…"} · estado ${f.status}`,
      );
      console.log(`     encargo:   ${f.trae_encargo ? "sí trae datos" : "VACÍO"} · pasos guardados: ${f.pasos} · progreso ${f.progress}%`);
      console.log(`     ${c.estado}: ${c.porQue}`);
      console.log("");
    }

    console.log("── RESUMEN ──────────────────────────────────────────────────");
    for (const [k, v] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(v).padStart(3)} · ${k}`);
    }
    console.log("");
    console.log("  Ninguno se ha ejecutado. Ninguno se ha cancelado. Ninguno se ha tocado.");
    console.log("");
  } catch (e) {
    console.error("No se pudo mirar:", e.message);
    process.exit(2);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

main();
