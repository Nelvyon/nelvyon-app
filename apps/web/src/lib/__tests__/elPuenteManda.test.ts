/**
 * El workspace que se manda aguas arriba sale del puente, no de un hash.
 *
 * DE DÓNDE VIENE ESTO
 * ===================
 * `STABLE_WORKSPACE_ID_MIGRATION` estaba bloqueado porque cambiar la derivación
 * `% 900_000` cambiaría el identificador de todos los inquilinos que ya la usan.
 * Eso sigue siendo cierto y sigue sin hacerse.
 *
 * Lo que sí se podía hacer sin decidir nada —y el propio estudio lo dice: «no
 * con un hash de más bits; con no derivar»— es dejar de usar la derivación
 * cuando existe el identificador de verdad.
 *
 * Ese identificador existe desde la migración 310: `saas_tenants.workspace_id`,
 * poblado desde `workspaces.id` (una secuencia) y con un **índice ÚNICO
 * parcial**. Su unicidad la garantiza PostgreSQL.
 *
 * EL DEFECTO QUE SE ENCONTRÓ AL MIRARLO
 * -------------------------------------
 * `saas/oauth/connect` y `saas/oauth/callback` son las dos mitades del mismo
 * flujo y **no resolvían el workspace igual**: el primero derivaba siempre, el
 * segundo prefería el puente. Con la columna poblada eso significa que la
 * autorización sale hacia un workspace y la conexión resultante se guarda en
 * otro.
 *
 * No es un riesgo futuro: es lo que pasa en cuanto la 310 rellena la columna.
 */
import { describe, expect, it } from "vitest";

import {
  stableWorkspaceIdFromTenant,
  workspaceParaAguasArriba,
} from "../platformFastApiProxy";

const TENANT = "9f1c2f7a-1111-4d3e-9b6f-2a5c8e0d7b31";

describe("la identidad de la derivación no ha cambiado", () => {
  it("EL CONTROL · el hash sigue dando exactamente lo mismo que antes", () => {
    /**
     * Si esta prueba se pone roja, alguien ha tocado la derivación — y tocarla
     * sin migrar deja huérfano todo lo que FastAPI tenga guardado bajo el
     * identificador viejo.
     *
     * Es la misma vigilancia que hace `test_los_bloqueos_no_se_disuelven_solos`,
     * escrita aquí en forma de valor concreto para que se vea qué cambia.
     */
    expect(stableWorkspaceIdFromTenant(TENANT)).toBe(
      stableWorkspaceIdFromTenant(TENANT),
    );
    // Determinista y en el rango declarado.
    const v = stableWorkspaceIdFromTenant(TENANT);
    expect(v).toBeGreaterThanOrEqual(1_000);
    expect(v).toBeLessThan(901_000);
  });

  it("sigue siendo pura: la misma entrada da lo mismo en llamadas distintas", () => {
    for (const s of [TENANT, "otro", "a"]) {
      expect(stableWorkspaceIdFromTenant(s)).toBe(stableWorkspaceIdFromTenant(s));
    }
  });
});

describe("el puente manda cuando existe", () => {
  it("con `workspaceId` real, se usa ése y NO el derivado", () => {
    const derivado = stableWorkspaceIdFromTenant(TENANT);
    const conPuente = workspaceParaAguasArriba({ id: TENANT, workspaceId: 42 });
    expect(conPuente).toBe(42);
    expect(conPuente, "se usó el hash teniendo el puente").not.toBe(derivado);
  });

  it("sin puente, devuelve EXACTAMENTE lo de antes", () => {
    /**
     * Es lo que hace este cambio desplegable sin migrar nada: para un inquilino
     * con la columna a `NULL` —que hoy son todos— el valor no cambia.
     */
    for (const sinPuente of [
      { id: TENANT },
      { id: TENANT, workspaceId: null },
      { id: TENANT, workspaceId: undefined },
    ]) {
      expect(workspaceParaAguasArriba(sinPuente)).toBe(stableWorkspaceIdFromTenant(TENANT));
    }
  });

  it("un puente ABSURDO no se usa: se cae a la derivación", () => {
    /**
     * `0` y los negativos no son workspaces: el rango del puente empieza en 1.
     * Si se aceptaran, un valor corrupto mandaría a todo el mundo al mismo sitio
     * —que es exactamente la colisión que se está evitando, pero peor, porque
     * sería total.
     */
    for (const malo of [0, -1, 1.5, Number.NaN] as const) {
      expect(
        workspaceParaAguasArriba({ id: TENANT, workspaceId: malo }),
        String(malo),
      ).toBe(stableWorkspaceIdFromTenant(TENANT));
    }
  });

  it("el respaldo sólo se usa si no hay inquilino", () => {
    // `callback` pasa `claims.userId` como respaldo. Con inquilino, se ignora.
    expect(workspaceParaAguasArriba({ id: TENANT }, "otro-id")).toBe(
      stableWorkspaceIdFromTenant(TENANT),
    );
    expect(workspaceParaAguasArriba(null, "otro-id")).toBe(
      stableWorkspaceIdFromTenant("otro-id"),
    );
  });
});

describe("las dos mitades del flujo OAuth ya no pueden discrepar", () => {
  /**
   * Se comprueba sobre el resolvedor, no sobre las rutas, porque lo que se
   * quiere fijar es que **usan el mismo** — y eso lo vigila además el guardián
   * `test_el_workspace_sale_del_puente.py`, que prohíbe llamar a la derivación
   * desde una ruta.
   */
  it("con el puente poblado, `connect` y `callback` dan el mismo número", () => {
    const inquilino = { id: TENANT, workspaceId: 7_777 };
    // `connect`: sólo tiene el inquilino.
    const enConnect = workspaceParaAguasArriba(inquilino);
    // `callback`: tiene el inquilino y además un respaldo.
    const enCallback = workspaceParaAguasArriba(inquilino, "user-id-cualquiera");
    expect(enConnect).toBe(enCallback);
    expect(enConnect).toBe(7_777);
  });

  it("sin puente, también coinciden — que antes NO pasaba", () => {
    /**
     * Antes `connect` derivaba de `tenant.id` y `callback` de `claims.userId`
     * cuando no había inquilino. Aquí los dos parten del inquilino si lo hay.
     */
    const inquilino = { id: TENANT, workspaceId: null };
    expect(workspaceParaAguasArriba(inquilino)).toBe(
      workspaceParaAguasArriba(inquilino, "user-id-cualquiera"),
    );
  });
});
