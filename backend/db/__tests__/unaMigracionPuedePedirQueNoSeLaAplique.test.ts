/**
 * Un comentario no es una puerta.
 *
 * ── LA INCIDENCIA QUE ORIGINA ESTA BATERÍA ──────────────────────────────────
 *
 * La migración 598 se ejecutó en producción **contra una instrucción expresa de
 * no ejecutarla**. No fue mala suerte: el migrador aplica todo lo que esté
 * pendiente, y la 598 estaba pendiente. Lo único que la «protegía» era una
 * cabecera que decía «espera al cutover» — prosa dentro de un fichero SQL.
 *
 * La puerta que ya existía (`evaluateProdMigrateGate`) es GLOBAL: decide entre
 * aplicar *todo* lo pendiente o *nada*. Sirve para «no migres producción sin
 * permiso»; no sirve para «esta de aquí, no». Abrir la ventana para una
 * migración la abre para todas las que compartan el push, y eso fue exactamente
 * lo que pasó.
 *
 * ── LO QUE SE FIJA AQUÍ ─────────────────────────────────────────────────────
 *
 * Que la marca la lea el CÓDIGO, y que falle cerrado: marcada y sin nombrar, no
 * corre. Y que nombrarla exija el nombre entero — sin prefijos ni comodines, para
 * que quien la suelta haya tenido que mirar qué fichero está soltando.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  MARCA_MANUAL,
  estaRetenida,
  nombresAprobados,
  sePuedeAplicar,
} from "../migracionesRetenidas";

const MIGRACIONES = path.resolve(__dirname, "..", "migrations");
const SIN_APROBAR = new Set<string>();

describe("una migración sin marca se aplica como siempre", () => {
  it("no se retiene lo que no lo pide", () => {
    const r = sePuedeAplicar("500_algo.sql", "ALTER TABLE x ADD COLUMN y text;", SIN_APROBAR);
    expect(r.aplicar).toBe(true);
    expect(r.motivo).toBe("normal");
  });
});

describe("una migración marcada NO corre sola", () => {
  const sql = `-- ${MARCA_MANUAL}\nREVOKE ALL ON TABLE x FROM y;`;

  it("se reconoce la marca", () => {
    expect(estaRetenida(sql)).toBe(true);
  });

  it("sin nombrarla, NO se aplica", () => {
    const r = sePuedeAplicar("598_x.sql", sql, SIN_APROBAR);
    expect(r.aplicar, "una migración marcada corrió sin que nadie la nombrara").toBe(false);
    expect(r.motivo).toContain("RETENIDA");
  });

  it("el motivo dice CÓMO soltarla, con el nombre exacto", () => {
    // Un mensaje que sólo dice «no» obliga a ir a buscar el cómo. Aquí el
    // remedio va con el problema.
    const r = sePuedeAplicar("598_x.sql", sql, SIN_APROBAR);
    expect(r.motivo).toContain("NELVYON_MIGRACION_MANUAL_APROBADA=598_x.sql");
  });

  it("nombrada entera, se aplica", () => {
    const r = sePuedeAplicar("598_x.sql", sql, new Set(["598_x.sql"]));
    expect(r.aplicar).toBe(true);
    expect(r.motivo).toContain("manual");
  });
});

describe("nombrar a medias no vale", () => {
  const sql = `-- ${MARCA_MANUAL}\nREVOKE ALL ON TABLE x FROM y;`;

  it("un prefijo NO la suelta", () => {
    // «598» no es un permiso: es media frase. Quien la suelta tiene que haber
    // mirado qué fichero está soltando.
    expect(sePuedeAplicar("598_x.sql", sql, new Set(["598"])).aplicar).toBe(false);
  });

  it("un comodín NO la suelta", () => {
    expect(sePuedeAplicar("598_x.sql", sql, new Set(["*"])).aplicar).toBe(false);
    expect(sePuedeAplicar("598_x.sql", sql, new Set(["598_*"])).aplicar).toBe(false);
  });

  it("otra migración distinta NO la suelta", () => {
    expect(sePuedeAplicar("598_x.sql", sql, new Set(["597_otra.sql"])).aplicar).toBe(false);
  });

  it("una lista vacía o ausente no aprueba nada", () => {
    expect(nombresAprobados(undefined).size).toBe(0);
    expect(nombresAprobados("").size).toBe(0);
    expect(nombresAprobados("  ,  ").size).toBe(0);
  });

  it("se admiten varias, separadas por comas", () => {
    const n = nombresAprobados("a.sql, b.sql");
    expect(n.has("a.sql")).toBe(true);
    expect(n.has("b.sql")).toBe(true);
  });
});

describe("el caso real que lo provocó", () => {
  it("la 598 lleva la marca en el árbol", () => {
    // Si alguien se la quita, esta prueba lo dice: es la única protección de que
    // un entorno nuevo no se recorte los permisos antes de tiempo.
    const f = fs
      .readdirSync(MIGRACIONES)
      .find((x) => x.startsWith("598_") && x.endsWith(".sql"));
    expect(f, "no se encuentra la 598").toBeDefined();
    const sql = fs.readFileSync(path.join(MIGRACIONES, f!), "utf8");
    expect(estaRetenida(sql), "la 598 perdió su marca: volvería a aplicarse sola").toBe(true);
  });

  it("y con la marca, el migrador la habría retenido", () => {
    // La reconstrucción del fallo: con el código de hoy, aquel despliegue no la
    // habría ejecutado.
    const f = fs
      .readdirSync(MIGRACIONES)
      .find((x) => x.startsWith("598_") && x.endsWith(".sql"))!;
    const sql = fs.readFileSync(path.join(MIGRACIONES, f), "utf8");
    expect(sePuedeAplicar(f, sql, SIN_APROBAR).aplicar).toBe(false);
  });

  it("CONTROL: la 597 NO está marcada — retener de más también es un fallo", () => {
    // Si la marca se pusiera por costumbre, el mecanismo dejaría de significar
    // nada y las migraciones normales dejarían de aplicarse.
    const f = fs
      .readdirSync(MIGRACIONES)
      .find((x) => x.startsWith("597_") && x.endsWith(".sql"))!;
    const sql = fs.readFileSync(path.join(MIGRACIONES, f), "utf8");
    expect(estaRetenida(sql)).toBe(false);
    expect(sePuedeAplicar(f, sql, SIN_APROBAR).aplicar).toBe(true);
  });
});
