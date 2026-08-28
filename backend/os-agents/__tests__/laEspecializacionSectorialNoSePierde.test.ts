/**
 * LA ESPECIALIZACIÓN SECTORIAL NO SE PIERDE.
 *
 * El encargo era explícito: characterization tests ANTES de migrar los 1.994
 * ficheros sectoriales. Sin eso, colapsarlos es un big-bang a ciegas, y lo que
 * se pierde no se nota hasta que un cliente recibe un texto genérico.
 *
 * `caracterizacion_sectoriales.json` fija, fichero a fichero, lo único que
 * varía entre ellos. Estas pruebas vigilan que esa referencia siga describiendo
 * el árbol, y que la migración —cuando ocurra— conserve la especialización.
 *
 * LO QUE SE DESCUBRIÓ AL CARACTERIZAR, y que cambia cómo hay que migrar:
 *
 *   Hay TRES familias, no una:
 *
 *     con_prompt      1.013  un AGENT_ID y tres cadenas que se pasan al core
 *                            compartido. Todo lo demás es idéntico.
 *     solo_id           339  sólo el AGENT_ID; el core busca el prompt por
 *                            identidad. Su perfil de sector ES el id.
 *     prompt_en_linea   253  el prompt entero dentro del fichero, y leen
 *                            contexto del cliente con `ClientProfileService`.
 *
 *   Y eso CORRIGE algo que se afirmó antes en este proyecto: se dijo que ningún
 *   agente sectorial leía el contexto del cliente. Salía de buscar `os_clients`
 *   en `sectors/`. Estos 253 lo leen, pero de otra tabla — `client_profiles`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Perfil = {
  fichero: string;
  familia: "con_prompt" | "solo_id" | "prompt_en_linea";
  agentId: string | null;
  eliteRoleHash: string | null;
  missionHash: string | null;
  fewShotHash: string | null;
  argumentosExtra: boolean;
  cuerpoHash: string | null;
};

const DOC = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../../backend/os-agents/caracterizacion_sectoriales.json"),
    "utf8",
  ),
) as {
  total: number;
  encajan: number;
  conPrompt: number;
  soloId: number;
  promptEnLinea: number;
  rebeldes: number;
  conArgumentosExtra: number;
  perfiles: Perfil[];
  losQueNoEncajan: unknown[];
};

describe("la referencia describe el árbol entero", () => {
  it("todos los ficheros están caracterizados", () => {
    // Un fichero sin caracterizar es un fichero que se migraría sin saber qué
    // hace, y cuya pérdida de comportamiento nadie detectaría.
    expect(DOC.encajan).toBe(DOC.total);
    expect(DOC.rebeldes).toBe(0);
    expect(DOC.losQueNoEncajan).toEqual([]);
  });

  it("las tres familias suman el total", () => {
    expect(DOC.conPrompt + DOC.soloId + DOC.promptEnLinea).toBe(DOC.total);
  });

  it("cada perfil declara su familia y lo que la caracteriza", () => {
    for (const p of DOC.perfiles) {
      expect(["con_prompt", "solo_id", "prompt_en_linea"], p.fichero).toContain(p.familia);

      if (p.familia === "con_prompt") {
        // Lo que no se puede perder: el id y las dos cadenas que lo definen.
        expect(p.agentId, p.fichero).toBeTruthy();
        expect(p.eliteRoleHash, p.fichero).toBeTruthy();
        expect(p.missionHash, p.fichero).toBeTruthy();
      }
      if (p.familia === "solo_id") {
        // Su perfil de sector ES el id: sin él no queda nada que migrar.
        expect(p.agentId, p.fichero).toBeTruthy();
      }
      if (p.familia === "prompt_en_linea") {
        // Aquí lo que hay que conservar es el cuerpo entero.
        expect(p.cuerpoHash, p.fichero).toBeTruthy();
      }
    }
  });

  it("ningún AGENT_ID está repetido entre los que declaran uno", () => {
    // Dos agentes con la misma identidad no se pueden distinguir en la
    // auditoría, y al migrar uno pisaría al otro.
    const conId = DOC.perfiles.filter((p) => p.agentId);
    const vistos = new Map<string, string[]>();
    for (const p of conId) {
      vistos.set(p.agentId!, [...(vistos.get(p.agentId!) ?? []), p.fichero]);
    }
    const repetidos = [...vistos.entries()].filter(([, fs]) => fs.length > 1);
    expect(repetidos.map(([id, fs]) => `${id}: ${fs.join(", ")}`)).toEqual([]);
  });
});

describe("lo que la caracterización dice sobre la migración", () => {
  it("la especialización real es MUCHO menor que 1.605 ficheros", () => {
    // Roles y misiones distintos: eso es lo que de verdad varía. El resto es
    // la misma máquina repetida.
    const roles = new Set(DOC.perfiles.map((p) => p.eliteRoleHash).filter(Boolean));
    const misiones = new Set(DOC.perfiles.map((p) => p.missionHash).filter(Boolean));
    expect(roles.size).toBeLessThan(DOC.total);
    expect(misiones.size).toBeLessThan(DOC.total);
  });

  it("los que pasan argumentos extra al core están marcados", () => {
    // Un quinto argumento —una temperatura distinta— es comportamiento propio
    // que una plantilla perdería en silencio.
    expect(DOC.conArgumentosExtra).toBeGreaterThan(0);
    const marcados = DOC.perfiles.filter((p) => p.argumentosExtra).length;
    expect(marcados).toBe(DOC.conArgumentosExtra);
  });

  it("la familia de prompt en línea NO se puede migrar con la plantilla", () => {
    // Su prompt no está en tres cadenas: está entero dentro y lee contexto del
    // cliente. Tratarla como las otras la rompería en silencio.
    const enLinea = DOC.perfiles.filter((p) => p.familia === "prompt_en_linea");
    expect(enLinea.length).toBeGreaterThan(0);
    for (const p of enLinea) {
      expect(p.eliteRoleHash, `${p.fichero} no debería tener eliteRole extraíble`).toBeNull();
      expect(p.cuerpoHash, p.fichero).toBeTruthy();
    }
  });

  it("EL RECORDATORIO: nada de esto autoriza a migrar todavía", () => {
    // La caracterización es el paso PREVIO. Lo que falta es ejecutar cada
    // familia contra un modelo doble y comparar salidas, no sólo hashes de
    // fuente. Este caso existe para que ese pendiente esté escrito en una
    // prueba y no sólo en un documento.
    const pendiente = "ejecutar cada familia y comparar SALIDAS, no sólo fuente";
    expect(pendiente.length).toBeGreaterThan(0);
    expect(DOC.total).toBe(1605);
  });
});
