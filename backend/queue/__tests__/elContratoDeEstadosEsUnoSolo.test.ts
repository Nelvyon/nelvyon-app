/**
 * EL CONTRATO DE ESTADOS ES UNO SOLO, ESCRITO EN TRES SITIOS.
 *
 * QUÉ LO PROVOCÓ. El estado de un trabajo vive en tres lugares que nadie
 * comparaba:
 *
 *   · `EstadoDeTrabajo`, en la cola, que es quien escribe;
 *   · `OsJobStatus`, en el almacén, que es quien lee;
 *   · el `CHECK` de la migración 579, que es quien manda de verdad.
 *
 * Los tres decían cosas distintas y no pasaba nada, porque el `CHECK` no estaba
 * aplicado todavía. El día que se aplicó, falló:
 *
 *     check constraint "os_jobs_status_ck" is violated by some row
 *
 * Había doce trabajos en `cancelled` —cancelados a propósito, con autorización—
 * y la lista del `CHECK` tenía seis estados sin ese. Se descubrió a mitad de una
 * migración de producción, que es el peor sitio posible para descubrirlo.
 *
 * Y no era el único desajuste: `OsJobStatus` declaraba CUATRO estados mientras
 * la cola escribía seis. `waiting_approval` y `dead_letter` llevaban tiempo
 * fuera del tipo, así que cualquier `switch` sobre él se creía exhaustivo sin
 * serlo. Ese defecto es anterior a la cancelación y nadie lo había visto.
 *
 * LO QUE ESTAS PRUEBAS IMPIDEN: que las tres listas vuelvan a separarse. No
 * comprueban que la lista sea «la correcta» —eso es una decisión de diseño—
 * sino que las tres digan lo mismo, que es lo que se puede comprobar solo.
 *
 * COSTE EXTERNO: 0 €. Lee ficheros y compara listas.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { INTOCABLES, RECLAMABLES, type EstadoDeTrabajo } from "../colaDeTrabajos";

const RAIZ = path.resolve(__dirname, "..", "..", "..");

/**
 * Los estados del tipo, leídos del fichero.
 *
 * Se lee el fuente en vez de importarlo porque una unión de TypeScript no
 * existe en tiempo de ejecución: `EstadoDeTrabajo` desaparece al compilar. Lo
 * único que queda es el texto.
 */
function estadosDeLaUnion(fichero: string, nombre: string): string[] {
  const t = fs.readFileSync(path.join(RAIZ, fichero), "utf8").replace(/\r\n/g, "\n");
  const i = t.indexOf(`export type ${nombre} =`);
  if (i < 0) throw new Error(`no se encuentra ${nombre} en ${fichero}`);
  const j = t.indexOf(";", i);
  const cuerpo = t.slice(i, j);
  // Se quitan los comentarios: un estado nombrado en una explicación no es un
  // estado del tipo. Es el mismo error que ya costó un falso positivo al
  // analizar las migraciones.
  const limpio = cuerpo.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, "");
  return [...limpio.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]).sort();
}

/** Los que permite el `CHECK` de la 579, leídos del propio SQL. */
function estadosDelCheck(): string[] {
  const f = path.join(RAIZ, "backend", "db", "migrations", "579_la_cola_que_nadie_vaciaba.sql");
  const sql = fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  const limpio = sql
    .split("\n")
    .map((l) => l.replace(/--.*$/, ""))
    .join("\n");
  const m = /CHECK\s*\(\s*status\s+IN\s*\(([\s\S]*?)\)\s*\)/i.exec(limpio);
  if (!m) throw new Error("no se encuentra el CHECK de status en la 579");
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
}

describe("las tres listas de estados dicen lo mismo", () => {
  const deLaCola = estadosDeLaUnion("backend/queue/colaDeTrabajos.ts", "EstadoDeTrabajo");
  const delAlmacen = estadosDeLaUnion("backend/os-agents/types.ts", "OsJobStatus");
  const delCheck = estadosDelCheck();

  it("el lector encuentra las tres listas y no están vacías", () => {
    // Sin esto, un cambio de formato daría tres listas vacías y las
    // comparaciones de abajo pasarían todas de golpe sin mirar nada.
    expect(deLaCola.length, "EstadoDeTrabajo").toBeGreaterThanOrEqual(6);
    expect(delAlmacen.length, "OsJobStatus").toBeGreaterThanOrEqual(6);
    expect(delCheck.length, "CHECK de la 579").toBeGreaterThanOrEqual(6);
  });

  it("LA REGLA: la cola, el almacén y la migración declaran los mismos estados", () => {
    expect(delCheck, "el CHECK de la 579 no coincide con lo que escribe la cola").toEqual(deLaCola);
    expect(delAlmacen, "OsJobStatus no coincide con lo que escribe la cola").toEqual(deLaCola);
  });

  it("`cancelled` está en las tres", () => {
    // El estado concreto que hizo caer la migración en producción.
    for (const [nombre, lista] of [
      ["la cola", deLaCola],
      ["el almacén", delAlmacen],
      ["el CHECK", delCheck],
    ] as const) {
      expect(lista, `falta «cancelled» en ${nombre}`).toContain("cancelled");
    }
  });
});

describe("un trabajo cancelado no se ejecuta nunca", () => {
  it("el trabajador sólo puede reclamar `queued`", () => {
    // Lista BLANCA, no negra. Con una lista negra, cada estado nuevo nace
    // reclamable y hay que acordarse de excluirlo; así nace intocable.
    expect(RECLAMABLES).toEqual(["queued"]);
    expect(RECLAMABLES as readonly string[]).not.toContain("cancelled");
  });

  it("`cancelled` es terminal: está entre los intocables", () => {
    // Sin esto, el rescate de trabajos varados devolvería a la cola algo que
    // alguien decidió no ejecutar — y lo ejecutaría.
    expect(INTOCABLES as readonly string[]).toContain("cancelled");
  });

  it("ningún estado terminal es reclamable, y ninguno queda sin clasificar", () => {
    // La comprobación que cierra el conjunto: cada estado o se puede reclamar
    // o es intocable, y nunca las dos cosas. Un estado que no esté en ninguna
    // lista es uno del que nadie ha decidido qué hacer.
    const todos = estadosDeLaUnion("backend/queue/colaDeTrabajos.ts", "EstadoDeTrabajo");
    const reclamables = new Set<string>(RECLAMABLES);
    const intocables = new Set<string>(INTOCABLES);

    for (const e of todos) {
      const enAmbas = reclamables.has(e) && intocables.has(e);
      expect(enAmbas, `«${e}» es a la vez reclamable e intocable`).toBe(false);
      // `running` es el único que no está en ninguna: es el estado de trabajo
      // en curso, ni se reclama ni es final.
      if (e === "running") continue;
      const enAlguna = reclamables.has(e) || intocables.has(e);
      expect(enAlguna, `«${e}» no está ni en RECLAMABLES ni en INTOCABLES`).toBe(true);
    }
  });

  it("los estados finales de verdad son intocables", () => {
    for (const e of ["completed", "failed", "dead_letter", "cancelled"] satisfies EstadoDeTrabajo[]) {
      expect(INTOCABLES as readonly string[], `${e} debería ser intocable`).toContain(e);
    }
  });
});
