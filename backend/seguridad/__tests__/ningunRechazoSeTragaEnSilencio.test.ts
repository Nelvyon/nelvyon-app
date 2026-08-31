/**
 * NINGUNA DECISIÓN DE PERMISOS SE DESCARTA SIN QUE SE VEA.
 *
 * DE DÓNDE SALE. `agentRunHook.ts` tenía un `catch` vacío con el comentario
 * «CRM opcional» que metía en el mismo saco dos cosas distintas: que el CRM no
 * esté disponible —tolerable— y que la comprobación de propiedad haya dicho que
 * NO. Lo segundo estaba bien impedido, pero se descartaba sin dejar rastro, y
 * desde 189 sitios de llamada.
 *
 * LA PREGUNTA ERA SI PASABA EN MÁS SITIOS. Se midió sobre 5.306 ficheros:
 *
 *     782 catch silenciosos en total
 *      99 alrededor de vocabulario de permisos
 *       0 alrededor de una LLAMADA de autorización
 *
 * Cero. El de `agentRunHook` era el único de su clase, y ya está corregido.
 * Esta prueba es lo que impide que vuelva a haber uno.
 *
 * LA DISTINCIÓN QUE HACE ÚTIL LA MEDIDA. Que en un bloque aparezca la palabra
 * `tenantId` sólo dice que hay un identificador en juego; que se invoque
 * `assertContactOwner(...)` dice que ahí se decide un permiso. Sin esa
 * diferencia el informe traía 99 avisos y ninguno accionable — y una
 * herramienta que señala lo correcto enseña a ignorarla.
 *
 * SE COMPROBARON A MANO LOS DOS MEDIA DE MÁS RIESGO, y los dos son correctos:
 *
 *   · `guardaDeGasto.ts` — sin autorización previa no hay fila padre a la que
 *     colgar la denegación. Se pierde el rastro en base, no la decisión: quien
 *     llama tiene el veredicto y lo registra.
 *   · `PuenteDeEjecucion.ts` — si marcar un gasto como fallido falla, el
 *     `fallo_del_proveedor` se registra y se devuelve igual.
 *
 * LO QUE ESTA PRUEBA NO DICE: que los 99 MEDIA estén bien. Dice que ninguno
 * envuelve una llamada de autorización, que es la forma que ya produjo un
 * defecto real.
 *
 * COSTE EXTERNO: 0 €. Lee ficheros.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import {
  ficherosDeCodigo,
  hallazgosEnFichero,
} from "../../../scripts/rechazos-que-se-tragan.mjs";

const RAIZ = path.resolve(__dirname, "..", "..", "..");

describe("el detector distingue una decisión de una mención", () => {
  it("EL CONTROL POSITIVO: reconoce el defecto que ya ocurrió", () => {
    // La forma exacta de `agentRunHook.ts` antes de arreglarlo.
    const codigo = `
      async function log(userId, input) {
        try {
          await CrmService.logActivity(cid, userId, "agent_output");
          await assertContactOwner(cid, userId);
        } catch {
          /* CRM opcional */
        }
      }`;
    const h = hallazgosEnFichero("ficticio.ts", codigo);
    expect(h).toHaveLength(1);
    expect(h[0].fuerza).toBe("ALTA");
  });

  it("una simple mención de tenantId es MEDIA, no ALTA", () => {
    // Si esto saliera ALTA, el informe volvería a traer 99 avisos y ninguno
    // accionable.
    const codigo = `
      async function f(tenantId) {
        try {
          await guardar(tenantId, datos);
        } catch {}
      }`;
    const h = hallazgosEnFichero("ficticio.ts", codigo);
    expect(h[0].fuerza).toBe("MEDIA");
  });

  it("EL CONTROL NEGATIVO: un catch vacío corriente no es sensible", () => {
    // La mayoría de los `catch` vacíos son correctos. Señalarlos todos sería
    // el final de la herramienta.
    const codigo = `
      function leer(txt) {
        try { return JSON.parse(txt); } catch {}
        return null;
      }`;
    const h = hallazgosEnFichero("ficticio.ts", codigo);
    expect(h[0].sensible).toBe(false);
    expect(h[0].fuerza).toBe("BAJA");
  });

  it("respeta la intención declarada por el autor", () => {
    // `catch { /* expected */ }` tras llamar a algo que DEBE lanzar es el
    // idioma de una autoprueba. Señalarlo fue el primer falso positivo de esta
    // herramienta, en `MobileSecureSession.ts`.
    const codigo = `
      function autoprueba() {
        try {
          assertMobileTenantIsolation(sesion, "otro");
          violaciones.push("cross_tenant_must_throw");
        } catch {
          /* expected */
        }
      }`;
    expect(hallazgosEnFichero("ficticio.ts", codigo)).toEqual([]);
  });

  it("un catch que SÍ hace algo no cuenta como silencioso", () => {
    // Ahí alguien decidió qué hacer. Es lo contrario del defecto.
    const codigo = `
      async function f(userId) {
        try {
          await assertContactOwner(cid, userId);
        } catch (e) {
          registrar({ evento: "denegado", causa: e.message });
        }
      }`;
    expect(hallazgosEnFichero("ficticio.ts", codigo)).toEqual([]);
  });
});

describe("el repositorio no tiene ninguna decisión de permisos tragada", () => {
  const ficheros = ficherosDeCodigo(RAIZ);

  it("el denominador no es cero: un cero aquí sería un aprobado falso", () => {
    expect(ficheros.length).toBeGreaterThan(1000);
  });

  it("LA REGLA: cero catch silenciosos alrededor de una llamada de autorización", () => {
    const altas: string[] = [];
    for (const rel of ficheros) {
      const abs = path.join(RAIZ, rel);
      if (!fs.existsSync(abs)) continue;
      for (const h of hallazgosEnFichero(rel, fs.readFileSync(abs, "utf8"))) {
        if (h.fuerza === "ALTA") altas.push(`${rel}:${h.linea}  («${h.porQue}»)`);
      }
    }
    expect(
      altas,
      `una decision de permisos se descarta en silencio:\n${altas.join("\n")}`,
    ).toEqual([]);
  });
});
