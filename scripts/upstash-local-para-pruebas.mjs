#!/usr/bin/env node
/**
 * Upstash de mentira, en memoria, SÓLO para poder probar un build de producción
 * en esta máquina. No sale nada a internet y no cuesta nada.
 *
 * POR QUÉ HACE FALTA, que es lo interesante.
 *
 * `checkIpRateLimit` tiene una salida prevista para pruebas —
 * `RATE_LIMIT_DISABLED=1`, activa sólo cuando `NODE_ENV !== "production"`— y
 * sobre un build de producción esa salida es INERTE. Next.js sustituye
 * `process.env.NODE_ENV` por la cadena literal en tiempo de compilación, así
 * que en el bundle la comparación es `"production" === "production"` y ninguna
 * variable de entorno en tiempo de ejecución la cambia.
 *
 * El efecto: no se puede autenticar contra un build de producción sin un
 * Upstash real. Y esa es exactamente la razón por la que siete rutas llegaron
 * a producción devolviendo 500 — nadie podía recorrerlas sobre el artefacto
 * que de verdad se despliega. Vitest ejecuta sin empaquetar, y el único camino
 * que quedaba exigía un servicio externo.
 *
 * Este proceso cierra ese hueco implementando las dos únicas operaciones que
 * `upstashIncrWithExpire` usa, con la misma semántica:
 *
 *   POST /pipeline  [["INCR", clave], ["EXPIRE", clave, segundos, "NX"]]
 *   → [{"result": n}, {"result": 0|1}]
 *
 * `NX` importa: pone la caducidad sólo si no la había. Refrescarla en cada
 * petición convertiría la ventana fija en deslizante y quien siguiera llamando
 * no se desbloquearía nunca.
 *
 * USO
 *   node scripts/upstash-local-para-pruebas.mjs &
 *   UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079 \
 *   UPSTASH_REDIS_REST_TOKEN=local node apps/web/server.js
 */
import http from "node:http";

const PUERTO = Number(process.env.UPSTASH_FAKE_PORT || 8079);

/** clave → { valor, caducaEn (epoch ms) | null } */
const almacen = new Map();

function ahora() {
  return Date.now();
}

function leer(clave) {
  const e = almacen.get(clave);
  if (!e) return null;
  if (e.caducaEn !== null && e.caducaEn <= ahora()) {
    almacen.delete(clave);
    return null;
  }
  return e;
}

function incr(clave) {
  const e = leer(clave);
  if (!e) {
    almacen.set(clave, { valor: 1, caducaEn: null });
    return 1;
  }
  e.valor += 1;
  return e.valor;
}

function expire(clave, segundos, nx) {
  const e = leer(clave);
  if (!e) return 0;
  // Con NX no se toca una caducidad ya puesta.
  if (nx && e.caducaEn !== null) return 0;
  e.caducaEn = ahora() + segundos * 1000;
  return 1;
}

function ejecutar([mando, ...args]) {
  switch (String(mando).toUpperCase()) {
    case "INCR":
      return { result: incr(args[0]) };
    case "EXPIRE":
      return {
        result: expire(args[0], Number(args[1]), args.slice(2).some((a) => String(a).toUpperCase() === "NX")),
      };
    case "DEL":
      almacen.delete(args[0]);
      return { result: 1 };
    case "GET": {
      const e = leer(args[0]);
      return { result: e ? String(e.valor) : null };
    }
    default:
      // Se responde con error en vez de fingir que funcionó: un doble que
      // miente sobre lo que sabe hacer es peor que no tenerlo.
      return { error: `comando no implementado en el doble local: ${mando}` };
  }
}

const servidor = http.createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (c) => {
    cuerpo += c;
  });
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: "sólo POST" }));
      return;
    }
    let peticion;
    try {
      peticion = JSON.parse(cuerpo || "[]");
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "cuerpo no es JSON" }));
      return;
    }
    // `/pipeline` recibe una lista de comandos; una ruta suelta, uno solo.
    const comandos = Array.isArray(peticion[0]) ? peticion : [peticion];
    res.end(JSON.stringify(comandos.map(ejecutar)));
  });
});

servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`[upstash-local] escuchando en http://127.0.0.1:${PUERTO} — nada sale de esta máquina`);
});
