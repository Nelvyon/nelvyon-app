/**
 * LA DEUDA DE LA 507 NO CRECE.
 *
 * `omisiones_conocidas_507.json` es la lista de sentencias de la migración
 * consolidada que NO se aplican sobre una base limpia. Existe porque esa deuda
 * era real y estaba oculta: el aplicador toleraba en silencio los códigos 42601
 * y 42P01, registraba la migración como aplicada, y así producción se quedó sin
 * cinco tablas que tres servicios consultan.
 *
 * Escribirla no la arregla; la hace contable. Estas pruebas vigilan que siga
 * siendo una lista cerrada y no vuelva a convertirse en una categoría abierta.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

/** Plazo del fichero: recorre el arbol. El porque, en `nelvyonEsLaAgencia`. */
vi.setConfig({ testTimeout: 60_000 });


type Omision = { id: string; code: string; sentencia: string; motivo: string };

const RAIZ_DB = resolve(process.cwd(), "../../backend/db");

const DOC = JSON.parse(readFileSync(resolve(RAIZ_DB, "omisiones_conocidas_507.json"), "utf8")) as {
  total: number;
  omisiones: Omision[];
};

/** Todo el SQL de migraciones EXCEPTO la 507, para saber quién crea qué. */
function sqlDeLasDemasMigraciones(): string {
  const dir = resolve(RAIZ_DB, "migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("507_"))
    .map((f) => readFileSync(resolve(dir, f), "utf8"))
    .join("\n");
}

function creaLaTabla(sql: string, tabla: string): boolean {
  return new RegExp(String.raw`CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?${tabla}\b`, "i").test(sql);
}

describe("la lista es coherente consigo misma", () => {
  it("el total declarado coincide con las entradas", () => {
    expect(DOC.omisiones).toHaveLength(DOC.total);
  });

  it("no hay identidades repetidas", () => {
    // La identidad se calcula sobre la sentencia entera y no sobre su vista
    // previa justamente por esto: con la vista previa, dos índices sobre la
    // misma tabla colisionaban en una sola entrada y uno quedaba sin vigilar.
    // Medido: 56 omisiones producían 55 identidades.
    const ids = new Set(DOC.omisiones.map((o) => o.id));
    expect(ids.size, "dos omisiones comparten identidad: una de ellas no está vigilada").toBe(
      DOC.omisiones.length,
    );
  });

  it("cada identidad tiene la forma que produce el módulo", () => {
    for (const o of DOC.omisiones) {
      expect(o.id, o.sentencia.slice(0, 60)).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it("cada entrada dice por qué falla", () => {
    for (const o of DOC.omisiones) {
      expect(o.motivo.trim().length, o.sentencia.slice(0, 60)).toBeGreaterThan(0);
      expect(o.code).toMatch(/^[0-9A-Z]{5}$/);
    }
  });
});

describe("lo que NUNCA puede quedarse en la lista", () => {
  it("ninguna tabla omitida se queda sin dueño", () => {
    // Que un CREATE TABLE aparezca aquí es aceptable SÓLO si otra migración
    // crea esa tabla — es el caso de `campaign_recipients` y `funnel_steps`,
    // que dependen de tablas que aún no existen cuando corre la 507 y que la
    // migración 578 crea después.
    //
    // Lo que no puede pasar es que una tabla omitida no la cree nadie: eso es
    // exactamente el agujero por el que producción perdió cinco tablas.
    const demas = sqlDeLasDemasMigraciones();
    const huerfanas: string[] = [];

    for (const o of DOC.omisiones) {
      const m = /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/i.exec(
        o.sentencia,
      );
      if (!m) continue;
      if (!creaLaTabla(demas, m[1])) huerfanas.push(m[1]);
    }

    expect(
      huerfanas,
      "estas tablas no las crea ninguna migración: el esquema queda incompleto y nadie se entera",
    ).toEqual([]);
  });

  it("ningún error de sintaxis", () => {
    const sintaxis = DOC.omisiones.filter((o) => o.code === "42601");
    expect(
      sintaxis.map((o) => o.sentencia.slice(0, 80)),
      "un error de sintaxis es una sentencia rota, no deriva de esquema",
    ).toEqual([]);
  });
});

describe("el tamaño de la deuda está fijado", () => {
  it("son 55, las medidas el 28 de agosto de 2026", () => {
    // Este número sólo debe BAJAR. Si sube, alguien ha añadido deuda nueva, y
    // esta prueba obliga a que sea una decisión consciente y no un descuido.
    expect(
      DOC.total,
      DOC.total > 55
        ? `la deuda ha crecido a ${DOC.total}: arregla la sentencia nueva en vez de anotarla`
        : `la deuda ha bajado a ${DOC.total}: actualiza este número, es una buena noticia`,
    ).toBe(55);
  });

  it("EL CONTROL: las cinco tablas que faltaban en producción sí tienen dueño", () => {
    // Control positivo del criterio de arriba: si la 578 desapareciera, la
    // prueba de huérfanas dejaría de proteger nada y ésta lo diría.
    const demas = sqlDeLasDemasMigraciones();
    for (const t of [
      "campaign_recipients",
      "funnel_steps",
      "workflow_nodes",
      "visual_workflow_executions",
      "workflow_trigger_registry",
    ]) {
      expect(creaLaTabla(demas, t), `${t}: ninguna migración fuera de la 507 la crea`).toBe(true);
    }
  });
});
