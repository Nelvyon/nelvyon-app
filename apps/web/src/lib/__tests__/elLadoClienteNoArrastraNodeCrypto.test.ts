/**
 * LO QUE ALCANZA EL NAVEGADOR NO PUEDE IMPORTAR MODULOS DE NODE.
 *
 * ── QUE PASO ────────────────────────────────────────────────────────────────
 *
 * Al hacer que `serverLogger` redactara secretos, empezo a importar
 * `backend/seguridad/loQueNoSeImprime.mjs`. Ese modulo importa `node:crypto`
 * para calcular la huella de un valor.
 *
 * `serverLogger` esta en el grafo del lado cliente, asi que webpack intento
 * meter `node:crypto` en el paquete del navegador y el build entero se cayo:
 *
 *     Module not found: node:crypto
 *       ../../backend/seguridad/loQueNoSeImprime.mjs
 *       ./src/lib/serverLogger.ts
 *
 * ── LO IMPORTANTE NO ES EL FALLO, ES QUIEN LO VIO ───────────────────────────
 *
 * NINGUNA de las 9.511 pruebas. En vitest el modulo resuelve sin problema
 * —corre en Node—, asi que la suite entera se quedo en verde con el build roto.
 * Lo caza `next build`, que es exactamente para lo que esta y por lo que se
 * ejecuta antes de dar nada por listo.
 *
 * Esta prueba no sustituye al build: lo adelanta. Un `next build` completo
 * tarda minutos; esto tarda milisegundos y encuentra el mismo error el dia que
 * alguien vuelva a cruzar la linea.
 *
 * ── LA SOLUCION NO FUE UN APANO DE EMPAQUETADO ──────────────────────────────
 *
 * `esNombreSensible` y `redactar` se fueron a `formaDeUnSecreto.mjs`, que no
 * importa nada. Porque de verdad son otra cosa: deciden por la FORMA de un
 * texto y pueden correr en cualquier sitio. `huella` y `describir` se quedaron
 * donde estaban — describen una variable de entorno del servidor y necesitan
 * hashear.
 *
 * COSTE EXTERNO: 0 EUR. Se leen ficheros.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..", "..", "..", "..", "..");

/** Modulos de Node que no existen en un navegador. */
const SOLO_DE_NODE = /from\s+["']node:(crypto|fs|path|os|child_process|net|tls|dns|worker_threads)["']/;

/**
 * Ficheros del lado web que sabemos que acaban en el paquete del navegador.
 *
 * Es una lista corta a proposito: seguir el grafo entero de importaciones
 * exigiria un analizador, y uno a medias daria falsos avisos hasta que alguien
 * lo desactivara. Estos son los que ya cruzaron la linea una vez.
 */
const PUERTAS_AL_NAVEGADOR = ["apps/web/src/lib/serverLogger.ts"];

/** Sigue las importaciones relativas de un fichero, hasta donde alcance. */
function alcanzables(desde: string, vistos = new Set<string>()): string[] {
  const abs = path.resolve(RAIZ, desde);
  if (vistos.has(abs) || !fs.existsSync(abs)) return [];
  vistos.add(abs);
  const fuente = fs.readFileSync(abs, "utf8");
  const salida = [desde];
  const patron = /from\s+["'](@\/\.\.\/\.\.\/[^"']+|\.[^"']+)["']/g;
  for (const m of fuente.matchAll(patron)) {
    const bruto = m[1];
    const rel = bruto.startsWith("@/../../")
      ? bruto.replace("@/../../", "")
      : path.join(path.dirname(desde), bruto);
    for (const ext of ["", ".ts", ".tsx", ".mjs", ".js", "/index.ts"]) {
      const candidato = (rel + ext).replace(/\\/g, "/");
      if (fs.existsSync(path.resolve(RAIZ, candidato))) {
        salida.push(...alcanzables(candidato, vistos));
        break;
      }
    }
  }
  return salida;
}

describe("el lado cliente no arrastra modulos de Node", () => {
  it("EL DENOMINADOR: se alcanzan varios ficheros desde la puerta", () => {
    // Sin esto, un resolvedor que no encontrara nada dejaria la comprobacion de
    // abajo mirando un solo fichero y aprobando siempre.
    const todos = PUERTAS_AL_NAVEGADOR.flatMap((p) => alcanzables(p));
    expect(todos.length).toBeGreaterThanOrEqual(3);
  });

  it("LA REGLA: nada alcanzable desde el lado web importa node:*", () => {
    const culpables: string[] = [];
    for (const puerta of PUERTAS_AL_NAVEGADOR) {
      for (const fichero of alcanzables(puerta)) {
        const fuente = fs.readFileSync(path.resolve(RAIZ, fichero), "utf8");
        const codigo = fuente.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
        const m = SOLO_DE_NODE.exec(codigo);
        if (m) culpables.push(`${fichero} importa node:${m[1]}  (alcanzable desde ${puerta})`);
      }
    }
    expect(
      culpables,
      "esto tumba `next build` con «Module not found» y NO lo ve ninguna prueba:\n  " +
        culpables.join("\n  "),
    ).toEqual([]);
  });

  it("EL CONTROL POSITIVO: la regla reconoce un import de Node", () => {
    // Sin esto, una expresion mal escrita aprobaria para siempre sin mirar.
    expect(SOLO_DE_NODE.test('import { createHash } from "node:crypto";')).toBe(true);
    expect(SOLO_DE_NODE.test('import fs from "node:fs";')).toBe(true);
  });

  it("EL CONTROL NEGATIVO: y no marca un import normal", () => {
    expect(SOLO_DE_NODE.test('import { redactar } from "./formaDeUnSecreto.mjs";')).toBe(false);
    expect(SOLO_DE_NODE.test('import React from "react";')).toBe(false);
  });

  it("y una MENCION en un comentario no cuenta", () => {
    /**
     * `formaDeUnSecreto.mjs` explica en su cabecera por que NO importa
     * `node:crypto`, con el nombre del modulo escrito. Sin quitar comentarios,
     * el fichero que resuelve el problema seria el primero en ser acusado.
     */
    const soloMencion = '/* antes importaba de "node:crypto" */\nexport const x = 1;';
    const codigo = soloMencion.replace(/\/\*[\s\S]*?\*\//g, " ");
    expect(SOLO_DE_NODE.test(codigo)).toBe(false);
  });
});
