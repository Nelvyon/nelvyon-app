/**
 * UNA SOLA RESPUESTA A «¿ESTE SECTOR ESTA REGULADO?».
 *
 * Habia TRES, medidas y distintas:
 *
 *   escudo            11 sectores
 *   registro          20 sectores, 6 con `regulated: true`
 *   packOrchestrator  2 escritos a mano: `dental` y `fintech_b2b`
 *
 * La tercera alimenta `compliance_flags.regulated_sector`, y `scorer.ts` exige
 * aviso legal —comprobacion L-CNT-03, CRITICA— solo si esa bandera es cierta.
 * Con dos sectores en la lista, un pack de farmacia o de despacho juridico
 * aprobaba el control de calidad sin aviso ninguno.
 *
 * LOS OCHO CASOS QUE PIDE LA DIRECTIVA estan abajo uno a uno, con su nombre.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";

import {
  regulacionDe,
  SECTORES_REGULADOS_LIBRES,
  tratarComoRegulado,
  type VeredictoDeRegulacion,
} from "../regulacionDeSector";
import { SECTOR_REGISTRY } from "../../autonomous/sectors/sectorRegistry";

describe("los ocho casos de la directiva", () => {
  const CASOS: ReadonlyArray<[string, string, VeredictoDeRegulacion]> = [
    ["salud", "salud", "REGULADO"],
    ["clinica", "clinica", "REGULADO"],
    ["finanzas", "finance", "REGULADO"],
    ["legal", "legal", "REGULADO"],
    // «Suplementos» no esta catalogado en ninguna de las tres fuentes. No se
    // inventa una entrada: se comprueba que sale DESCONOCIDO, que es la
    // respuesta honesta, y que `tratarComoRegulado` lo cubre igualmente.
    ["suplementos", "suplementos", "DESCONOCIDO"],
    ["servicio no regulado", "restaurant", "NO_REGULADO"],
    ["sector desconocido", "lo_que_sea_2026", "DESCONOCIDO"],
  ];

  for (const [nombre, sector, esperado] of CASOS) {
    it(`${nombre} → ${esperado}`, () => {
      expect(regulacionDe(sector)).toBe(esperado);
    });
  }

  it("error de lookup: un valor que no es texto no revienta ni aprueba", () => {
    // El octavo caso. Un `undefined` de un intake incompleto, un `null` de una
    // columna vacia, un numero de una integracion mal tipada. Ninguno puede
    // acabar en «no regulado».
    for (const malo of [undefined, null, 123, {}, [], NaN, "", "   "]) {
      expect(regulacionDe(malo as unknown), `${String(malo)}`).toBe("DESCONOCIDO");
      expect(tratarComoRegulado(malo as unknown), `${String(malo)}`).toBe(true);
    }
  });
});

describe("UNKNOWN != SAFE", () => {
  it("lo desconocido se trata como regulado", () => {
    expect(regulacionDe("sector_que_no_existe")).toBe("DESCONOCIDO");
    expect(tratarComoRegulado("sector_que_no_existe")).toBe(true);
  });

  it("EL CONTROL: lo que SI se sabe que no esta regulado, no se trata como regulado", () => {
    // Sin esto, `tratarComoRegulado = () => true` pasaria todo lo de arriba y
    // marcaria el mundo entero como regulado, que es igual de inutil.
    expect(tratarComoRegulado("restaurant")).toBe(false);
    expect(tratarComoRegulado("fitness")).toBe(false);
    expect(tratarComoRegulado("ecommerce")).toBe(false);
  });

  it("y el prototipo de Object no cuela un sector", () => {
    // `SECTOR_REGISTRY[sectorId]` era un acceso directo sobre un objeto
    // literal: `constructor` devolvia algo truthy y el sector salia por «no
    // regulado». Aqui se usan Set, que no tienen ese problema, y se fija.
    for (const veneno of ["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"]) {
      expect(regulacionDe(veneno), veneno).toBe("DESCONOCIDO");
      expect(tratarComoRegulado(veneno), veneno).toBe(true);
    }
  });
});

describe("normalizacion: la misma cosa escrita de otra forma es la misma cosa", () => {
  it("mayusculas y espacios no cambian el veredicto", () => {
    for (const forma of ["Dental", "  dental  ", "DENTAL", "Dental "]) {
      expect(regulacionDe(forma), forma).toBe("REGULADO");
    }
  });
});

describe("la fuente canonica no se separa de lo que copia", () => {
  /**
   * `regulacionDeSector` guarda una COPIA de los 19 identificadores del enum y
   * de cuales llevan `regulated: true`, para no arrastrar las fichas enteras a
   * los sitios que solo necesitan la bandera.
   *
   * Una copia sin vigilancia es una cuarta fuente esperando su turno. Estas dos
   * pruebas son lo que la hace segura: si alguien anade un sector al registro o
   * le cambia la bandera, fallan aqui y no en produccion.
   */
  it("los mismos identificadores que el registro", () => {
    for (const id of Object.keys(SECTOR_REGISTRY)) {
      expect(regulacionDe(id), `${id} no esta en la fuente canonica`).not.toBe("DESCONOCIDO");
    }
  });

  it("la misma bandera que el registro, sector por sector", () => {
    const discrepan: string[] = [];
    for (const [id, perfil] of Object.entries(SECTOR_REGISTRY)) {
      const enElRegistro = !!(perfil as { regulated?: boolean }).regulated;
      const enLaCanonica = regulacionDe(id) === "REGULADO";
      if (enElRegistro !== enLaCanonica) {
        discrepan.push(`${id}: registro=${enElRegistro} canonica=${enLaCanonica}`);
      }
    }
    expect(discrepan, `divergen ${discrepan.length}:\n  ${discrepan.join("\n  ")}`).toEqual([]);
  });

  it("el denominador no es cero: hay 20 sectores y al menos 6 regulados", () => {
    /**
     * Sin esto, un `SECTOR_REGISTRY` vacio pasaria las dos de arriba sin
     * comparar nada.
     *
     * Y no es teorico: la primera vez que corrio, esta prueba encontro un
     * sector que el barrido manual habia contado mal — `saas_b2b`, el
     * vigesimo—. La copia decia 19. Por eso la copia lleva vigilancia.
     */
    const ids = Object.keys(SECTOR_REGISTRY);
    expect(ids.length).toBe(20);
    expect(ids.filter((id) => regulacionDe(id) === "REGULADO").length).toBeGreaterThanOrEqual(6);
  });
});

describe("no se pierde nada al unificar", () => {
  it("los 11 del escudo siguen siendo REGULADO", () => {
    for (const s of SECTORES_REGULADOS_LIBRES) {
      expect(regulacionDe(s), s).toBe("REGULADO");
    }
    expect(SECTORES_REGULADOS_LIBRES.size).toBeGreaterThanOrEqual(11);
  });

  it("los 2 de packOrchestrator siguen siendo REGULADO", () => {
    // `dental` y `fintech_b2b` eran lo unico que ese fichero marcaba. Unificar
    // no puede quitarles la exigencia de aviso que ya tenian.
    expect(regulacionDe("dental")).toBe("REGULADO");
    expect(regulacionDe("fintech_b2b")).toBe("REGULADO");
  });
});
