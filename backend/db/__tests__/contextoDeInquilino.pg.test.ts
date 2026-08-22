/**
 * El contexto de inquilino llega a PostgreSQL, y NO sobrevive a la petición.
 *
 * QUÉ SE CERTIFICA AQUÍ
 * ---------------------
 * Que `DbClient` fija `request.jwt.claim.sub`, `app.tenant_id` y
 * `app.workspace_id` antes de la primera consulta de cada petición, y que ese
 * contexto desaparece al terminarla.
 *
 * LA PRUEBA QUE DE VERDAD IMPORTA ES A → B → A
 * ---------------------------------------------
 * Un pool reutiliza conexiones. Si el contexto se fijara con
 * `set_config(..., false)` —ámbito de SESIÓN— la petición de B se encontraría el
 * inquilino de A todavía puesto, y la de A el de B. Sería una fuga entre clientes
 * causada exactamente por el mecanismo que debe evitarlas, y no la vería nadie:
 * las consultas no dan error, devuelven las filas del otro.
 *
 * Por eso estas pruebas fuerzan `NELVYON_DB_POOL_MAX=1`: las tres peticiones
 * comparten FÍSICAMENTE la misma conexión. Con el pool por defecto podrían caer
 * en conexiones distintas y la prueba pasaría por suerte, que es la peor forma de
 * pasar.
 *
 * POR QUÉ MIRA `current_setting` Y NO FILAS
 * ------------------------------------------
 * Hoy el rol de producción es superusuario, así que ninguna política se evalúa y
 * contar filas no distinguiría un contexto bien puesto de uno ausente. Lo que se
 * comprueba es el mecanismo: que la variable llega, que vale lo que debe y que se
 * va. El aislamiento por RLS con un rol sin BYPASSRLS se certifica aparte, cuando
 * ese rol exista.
 *
 * Se salta sin `NELVYON_WEB_CERT_DSN`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { conInquilino, sinInquilinoAPropósito } from "../contextoDeInquilino";

const DSN = process.env.NELVYON_WEB_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

const TEN_A = "aaaaaaaa-1111-4000-8000-00000000000a";
const TEN_B = "bbbbbbbb-2222-4000-8000-00000000000b";

let db: import("../DbClient").DbClient;

/** Lo que la sesión ve AHORA mismo, desde dentro de la propia consulta. */
async function leerContexto(): Promise<{ sub: string; tenant: string; ws: string }> {
  const filas = await db.query<{ sub: string; tenant: string; ws: string }>(
    `SELECT current_setting('request.jwt.claim.sub', true) AS sub,
            current_setting('app.tenant_id', true)        AS tenant,
            current_setting('app.workspace_id', true)     AS ws`,
  );
  const f = filas[0]!;
  return { sub: f.sub ?? "", tenant: f.tenant ?? "", ws: f.ws ?? "" };
}

describeSiHayPg("contexto de inquilino en DbClient (PostgreSQL real)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = DSN;
    // Una sola conexion: es lo que hace decisiva la prueba de contaminacion.
    process.env.NELVYON_DB_POOL_MAX = "1";
    const { DbClient } = await import("../DbClient");
    db = DbClient.getInstance();
  });

  afterAll(async () => { await db?.end(); });

  // ═══════════════════════════════════════════════════════════════════════════
  // Llega
  // ═══════════════════════════════════════════════════════════════════════════

  it("el inquilino llega a la sesion de PostgreSQL", async () => {
    const visto = await conInquilino({ tenantId: TEN_A, workspaceId: 101 }, leerContexto);
    expect(visto.tenant).toBe(TEN_A);
    expect(visto.ws).toBe("101");
    expect(visto.sub).toBe(TEN_A);
  });

  it("el `userId` manda sobre el tenant para `request.jwt.claim.sub`", async () => {
    // 606 politicas resuelven el inquilino a traves de `nelvyon_jwt_user_id()`,
    // que lee ese claim. Cuando se conoce el usuario, es el sujeto correcto.
    const usuario = "cccccccc-3333-4000-8000-00000000000c";
    const visto = await conInquilino({ tenantId: TEN_A, userId: usuario }, leerContexto);
    expect(visto.sub).toBe(usuario);
    expect(visto.tenant).toBe(TEN_A);
  });

  it("sobrevive a los `await` y a un `Promise.all` dentro de la peticion", async () => {
    // Es la razon de usar AsyncLocalStorage en vez de un parametro: si el
    // contexto se perdiera al primer `await`, la mayoria de las rutas —que hacen
    // varias consultas en paralelo— consultarian sin inquilino.
    const [a, b] = await conInquilino({ tenantId: TEN_A, workspaceId: 101 }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      return Promise.all([leerContexto(), leerContexto()]);
    });
    expect(a.tenant).toBe(TEN_A);
    expect(b.tenant).toBe(TEN_A);
  });

  it("dentro de `withTransaction` esta puesto desde la primera consulta", async () => {
    // Con RLS activa, una primera consulta sin contexto no falla: devuelve cero
    // filas. Un fallo que se manifiesta como datos que faltan es peor que uno que
    // revienta, porque se atribuye a otra cosa.
    const visto = await conInquilino({ tenantId: TEN_B, workspaceId: 202 }, () =>
      db.withTransaction(async (client) => {
        const r = await client.query(
          `SELECT current_setting('app.tenant_id', true) AS t,
                  current_setting('app.workspace_id', true) AS w`);
        return r.rows[0] as { t: string; w: string };
      }));
    expect(visto.t).toBe(TEN_B);
    expect(visto.w).toBe("202");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Y se va
  // ═══════════════════════════════════════════════════════════════════════════

  it("A -> B -> A sobre LA MISMA conexion: ninguna ve a la otra", async () => {
    // LA PRUEBA. `NELVYON_DB_POOL_MAX=1` garantiza que las tres comparten
    // conexion fisica, asi que un contexto de ambito de sesion se veria seguro.
    const a1 = await conInquilino({ tenantId: TEN_A, workspaceId: 101 }, leerContexto);
    const b = await conInquilino({ tenantId: TEN_B, workspaceId: 202 }, leerContexto);
    const a2 = await conInquilino({ tenantId: TEN_A, workspaceId: 101 }, leerContexto);

    expect(a1.tenant).toBe(TEN_A);
    expect(b.tenant).toBe(TEN_B);
    expect(a2.tenant).toBe(TEN_A);
    expect(b.ws).toBe("202");
    expect(a2.ws).toBe("101");
  });

  it("si B fija MENOS variables que A, no hereda las que A dejo", async () => {
    // La version afilada de A -> B -> A, y la que de verdad separa el ambito de
    // transaccion del de sesion.
    //
    // Con ambito de sesion, A -> B -> A pasa igualmente: cada peticion SOBRESCRIBE
    // lo que fija, asi que la contaminacion no se ve mientras todas fijen lo
    // mismo. Se ve cuando B fija MENOS: aqui A pone workspace 101 y B solo pone
    // tenant. Si el contexto durara la sesion, B heredaria el workspace de A y
    // consultaria como el otro cliente sin que nada lo indicara.
    //
    // Es un caso real, no rebuscado: las rutas del SaaS traen `tenantId` del JWT
    // y las del OS traen `workspaceId` de la cabecera. Alternarlas sobre la misma
    // conexion es el trafico normal del producto.
    await conInquilino({ tenantId: TEN_A, workspaceId: 101 }, leerContexto);
    const b = await conInquilino({ tenantId: TEN_B }, leerContexto);
    expect(b.tenant).toBe(TEN_B);   // control positivo: lo suyo si esta
    expect(b.ws).toBe("");          // y lo de A, no
  });

  it("una consulta SIN peticion no hereda el contexto de la anterior", async () => {
    // El camino de los crons y las migraciones. Si heredara, un cron ejecutado
    // justo despues de una peticion trabajaria como ese cliente.
    await conInquilino({ tenantId: TEN_A, workspaceId: 101 }, leerContexto);
    const suelta = await leerContexto();
    expect(suelta.tenant).toBe("");
    expect(suelta.ws).toBe("");
    expect(suelta.sub).toBe("");
  });

  it("`sinInquilinoAPropósito` tampoco hereda nada", async () => {
    await conInquilino({ tenantId: TEN_B, workspaceId: 202 }, leerContexto);
    const visto = await sinInquilinoAPropósito(leerContexto);
    expect(visto.tenant).toBe("");
  });

  it("un error dentro de la peticion no deja el contexto puesto", async () => {
    // El ROLLBACK tiene que revertir las variables igual que el COMMIT. Si no, un
    // fallo dejaria la conexion marcada con el ultimo inquilino y la siguiente
    // peticion que la tomara del pool trabajaria como el.
    await expect(
      conInquilino({ tenantId: TEN_A, workspaceId: 101 }, () =>
        db.query("SELECT 1 FROM tabla_que_no_existe_a_proposito")),
    ).rejects.toThrow();
    const suelta = await leerContexto();
    expect(suelta.tenant).toBe("");
  });

  it("el contexto no escapa de la peticion que lo fijo", async () => {
    let dentro = "";
    await conInquilino({ tenantId: TEN_A }, async () => {
      dentro = (await leerContexto()).tenant;
    });
    const fuera = (await leerContexto()).tenant;
    expect(dentro).toBe(TEN_A);   // control positivo: dentro SI estaba
    expect(fuera).toBe("");
  });
});
