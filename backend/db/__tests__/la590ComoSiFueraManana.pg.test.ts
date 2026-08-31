/**
 * LA MIGRACION 590, AUDITADA COMO SI MAÑANA FUERA A PRODUCCION.
 *
 * La 590 cierra `workspace_members.status` a `('active','invited')`. Es una
 * restriccion sobre una tabla viva del producto: si esta mal, el sintoma no es
 * un test rojo, es un alta de miembro que revienta en produccion.
 *
 * ── SE EJECUTA EL FICHERO, NO UNA COPIA ─────────────────────────────────────
 *
 * El SQL se lee de `backend/db/migrations/590_*.sql` en cada prueba. Copiar el
 * cuerpo aqui mediria la copia: la migracion podria cambiar y esto seguiria en
 * verde certificando lo que ya no se aplica.
 *
 * ── Y SE EJECUTA DENTRO DE UNA TRANSACCION QUE SE REVIERTE ──────────────────
 *
 * `workspace_members` es una tabla real y compartida con el resto de la suite,
 * que corre en paralelo. Cada prueba abre BEGIN, hace lo suyo y ROLLBACK, asi
 * que ni la restriccion ni las filas sinteticas sobreviven a la prueba.
 *
 * Tiene ademas una ventaja: comprobar que TODO el trabajo de la migracion cabe
 * en una transaccion es en si mismo parte de la certificacion. Una migracion
 * que no fuera atomica dejaria la tabla a medias si algo fallara por el camino.
 *
 * COSTE EXTERNO: 0 EUR. Base local, datos sinteticos, nada persiste.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DSN = process.env.NELVYON_WEB_CERT_DSN ?? process.env.NELVYON_PG_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;
let SQL_590 = "";

const RESTRICCION = "workspace_members_status_ck";

/**
 * Abre una transaccion, quita la 590 si estuviera puesta, ejecuta, y revierte.
 *
 * EL `DROP CONSTRAINT` ES PARTE DEL METODO, no un apaño. Esta base local ya
 * tiene la 590 aplicada de una sesion anterior, y una migracion que sale por el
 * atajo de «ya existe» no certifica nada: las pruebas de rechazo ni siquiera
 * podrian sembrar la fila mala, porque la restriccion la rechazaria antes.
 *
 * Quitarla DENTRO de la transaccion deja a cada prueba partiendo del estado
 * real de produccion —donde no esta aplicada— y el ROLLBACK la devuelve. Asi la
 * suite certifica lo mismo en una base virgen y en una que ya la tenga, que es
 * exactamente la propiedad que hace falta antes de aplicarla de verdad.
 */
async function enUnaTransaccionQueSeRevierte<T>(
  fn: (c: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      `ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS ${RESTRICCION}`,
    );
    return await fn(c);
  } finally {
    // Siempre ROLLBACK: ni cuando la prueba pasa se deja nada puesto.
    await c.query("ROLLBACK").catch(() => {});
    c.release();
  }
}

/** Un workspace de usar y tirar dentro de la transaccion en curso. */
async function workspaceDePrueba(c: import("pg").PoolClient): Promise<number> {
  const { rows } = await c.query<{ id: number }>(
    `INSERT INTO workspaces (user_id, name, slug, status, plan, created_at)
     VALUES (gen_random_uuid()::text, 'cert 590', 'cert-590-' || substr(md5(random()::text),1,8),
             'active', 'starter', NOW())
     RETURNING id`,
  );
  return rows[0].id;
}

async function meteMiembro(
  c: import("pg").PoolClient,
  ws: number,
  estado: string,
  rol = "member",
): Promise<void> {
  await c.query(
    `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
     VALUES ($1, gen_random_uuid()::text, $2, $3, $4, NOW()::text)`,
    [ws, `c590-${Math.random().toString(36).slice(2, 10)}@ejemplo.test`, rol, estado],
  );
}

describeSiHayPg("la migracion 590, como si mañana fuera a produccion", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    const dir = path.resolve(__dirname, "..", "migrations");
    const fichero = fs
      .readdirSync(dir)
      .find((f) => f.startsWith("590_") && f.endsWith(".sql"));
    if (!fichero) throw new Error("no se encuentra la migracion 590 en backend/db/migrations");
    SQL_590 = fs.readFileSync(path.join(dir, fichero), "utf8");
  });

  afterAll(async () => {
    await pool?.end();
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Que se esta ejecutando de verdad
  // ═════════════════════════════════════════════════════════════════════════

  it("EL DENOMINADOR: el fichero de la 590 se ha leido y trae la restriccion", () => {
    // Sin esto, un fichero vacio o mal encontrado haria pasar todo lo de abajo
    // sin ejecutar una linea de la migracion.
    expect(SQL_590.length).toBeGreaterThan(500);
    expect(SQL_590).toContain(RESTRICCION);
    expect(SQL_590).toContain("NOT VALID");
    expect(SQL_590).toContain("VALIDATE CONSTRAINT");
  });

  it("cada prueba parte SIN la restriccion, este o no en la base", async () => {
    /**
     * Es la propiedad que hace comparables los resultados. Da igual que la base
     * local ya tenga la 590 aplicada de una sesion anterior: dentro de la
     * transaccion se quita, asi que lo que se certifica es siempre la
     * APLICACION sobre el estado de produccion, no el atajo de «ya existe».
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const { rows } = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_constraint WHERE conname = $1`,
        [RESTRICCION],
      );
      expect(Number(rows[0].n), "la transaccion no partio sin la restriccion").toBe(0);
    });
  });

  it("y el ROLLBACK la devuelve: la base queda como estaba", async () => {
    /**
     * Sin esto, esta suite podria estar dejando `workspace_members` sin su
     * restriccion para todo el resto de la ejecucion — y el fallo aparecería en
     * otra prueba, lejos de aqui.
     */
    const antes = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM pg_constraint WHERE conname = $1`,
      [RESTRICCION],
    );
    await enUnaTransaccionQueSeRevierte(async () => undefined);
    const despues = await pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM pg_constraint WHERE conname = $1`,
      [RESTRICCION],
    );
    expect(despues.rows[0].n, "la suite se dejo la restriccion quitada").toBe(antes.rows[0].n);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Aplicacion sobre datos validos
  // ═════════════════════════════════════════════════════════════════════════

  it("sobre una tabla con `active` e `invited`, aplica y queda VALIDADA", async () => {
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");
      await meteMiembro(c, ws, "invited");

      await c.query(SQL_590);

      const { rows } = await c.query<{ validada: boolean; expr: string }>(
        `SELECT con.convalidated AS validada, pg_get_constraintdef(con.oid) AS expr
           FROM pg_constraint con WHERE con.conname = $1`,
        [RESTRICCION],
      );
      expect(rows, "la migracion no creo la restriccion").toHaveLength(1);
      // `NOT VALID` sin `VALIDATE` dejaria las filas viejas sin comprobar: la
      // restriccion existiria y no significaria nada para lo que ya hay.
      expect(rows[0].validada, "la restriccion quedo sin validar").toBe(true);
      expect(rows[0].expr).toContain("active");
      expect(rows[0].expr).toContain("invited");
    });
  });

  it("es idempotente: aplicarla dos veces no falla ni duplica", async () => {
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");

      await c.query(SQL_590);
      await c.query(SQL_590); // la segunda debe salir por «ya existe»

      const { rows } = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_constraint WHERE conname = $1`,
        [RESTRICCION],
      );
      expect(Number(rows[0].n)).toBe(1);
    });
  });

  it("no toca ni los indices ni el RLS de la tabla", async () => {
    /**
     * Una migracion que ademas de lo suyo cambiara indices o politicas seria
     * una migracion con efectos que nadie leyo en su nombre. Se comparan los
     * dos antes y despues.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const antes = await c.query(
        `SELECT (SELECT count(*) FROM pg_index WHERE indrelid = 'workspace_members'::regclass) AS idx,
                (SELECT count(*) FROM pg_policies WHERE tablename = 'workspace_members') AS pol,
                (SELECT relrowsecurity FROM pg_class WHERE relname = 'workspace_members') AS rls`,
      );
      await c.query(SQL_590);
      const despues = await c.query(
        `SELECT (SELECT count(*) FROM pg_index WHERE indrelid = 'workspace_members'::regclass) AS idx,
                (SELECT count(*) FROM pg_policies WHERE tablename = 'workspace_members') AS pol,
                (SELECT relrowsecurity FROM pg_class WHERE relname = 'workspace_members') AS rls`,
      );
      expect(despues.rows[0]).toEqual(antes.rows[0]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Produccion sintetica: que pasa con cada dato que podria haber
  // ═════════════════════════════════════════════════════════════════════════

  const FUERA_DEL_CONTRATO = [
    ["inactive", "un estado que solo existia en pruebas"],
    ["revoked", "un ciclo de vida que el producto no implementa"],
    ["pending", "el nombre que uno esperaria y que nadie escribe"],
    ["activo", "el mismo estado en castellano"],
    ["Active", "el mismo estado con otra caja"],
    ["activated", "el que vendria de una integracion"],
    ["", "la cadena vacia"],
  ] as const;

  for (const [malo, porque] of FUERA_DEL_CONTRATO) {
    it(`si ya hubiera un «${malo}», la migracion PARA y dice cual (${porque})`, async () => {
      await enUnaTransaccionQueSeRevierte(async (c) => {
        const ws = await workspaceDePrueba(c);
        await meteMiembro(c, ws, "active", "owner");
        await meteMiembro(c, ws, malo);

        // El mensaje tiene que NOMBRAR el valor infractor. Un «violates check
        // constraint» a secas obligaria a ir a buscarlo a mano con la migracion
        // a medias y el turno de noche encima.
        await expect(c.query(SQL_590)).rejects.toThrow(
          new RegExp(malo === "" ? "590: hay filas con un status fuera del contrato" : malo),
        );
      });
    });
  }

  it("y cuando para, NO deja la restriccion a medias", async () => {
    /**
     * ATOMICIDAD. Es lo que separa una migracion que falla de una que rompe: si
     * la restriccion quedara creada como `NOT VALID` tras el error, las altas
     * nuevas empezarian a rechazarse sin que nadie hubiera decidido aplicarla.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "revoked");

      /**
       * SE USA UN SAVEPOINT Y NO UN ROLLBACK ENTERO.
       *
       * Tras el error la transaccion queda abortada y no admite preguntas. El
       * primer intento hacia ROLLBACK y BEGIN de nuevo — y eso deshace tambien
       * el `DROP CONSTRAINT` de la preparacion, asi que la restriccion
       * reaparecia y la prueba se acusaba a si misma.
       *
       * `ROLLBACK TO SAVEPOINT` deshace solo la migracion fallida y deja la
       * transaccion utilizable, que es exactamente lo que hay que observar.
       */
      await c.query("SAVEPOINT antes_de_la_590");
      await expect(c.query(SQL_590)).rejects.toThrow();
      await c.query("ROLLBACK TO SAVEPOINT antes_de_la_590");

      const { rows } = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM pg_constraint WHERE conname = $1`,
        [RESTRICCION],
      );
      expect(Number(rows[0].n), "la restriccion quedo puesta pese a fallar la migracion").toBe(0);
    });
  });

  it("no puede haber un status NULL: el esquema ya lo impide", async () => {
    // La migracion contempla `status IS NULL`, y esta prueba certifica que ese
    // caso no puede darse por otra via — no que la migracion se equivoque al
    // preverlo. Una defensa de mas no molesta; darla por imposible sin mirar,
    // si.
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await expect(
        c.query(
          `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
           VALUES ($1, gen_random_uuid()::text, 'n@ejemplo.test', 'member', NULL, NOW()::text)`,
          [ws],
        ),
      ).rejects.toThrow(/not-null|null value/i);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Despues de aplicarla: que sigue funcionando y que deja de funcionar
  // ═════════════════════════════════════════════════════════════════════════

  it("despues, los dos estados canonicos siguen entrando", async () => {
    /**
     * EL CONTROL POSITIVO DE TODO ESTO. Una restriccion que lo rechazara todo
     * pasaria cada una de las pruebas de rechazo de arriba y dejaria el producto
     * sin poder dar de alta a nadie.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");
      await c.query(SQL_590);
      await meteMiembro(c, ws, "active");
      await meteMiembro(c, ws, "invited");
      const { rows } = await c.query<{ n: string }>(
        `SELECT count(*) AS n FROM workspace_members WHERE workspace_id = $1`,
        [ws],
      );
      expect(Number(rows[0].n)).toBe(3);
    });
  });

  it("y los roles siguen siendo cosa aparte: owner, admin, member, viewer", async () => {
    // El contrato es sobre `status`. Si tocara tambien `role`, un alta de admin
    // empezaria a fallar por una migracion que dice hablar de otra cosa.
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");
      await c.query(SQL_590);
      for (const rol of ["admin", "operator", "member", "viewer"]) {
        await meteMiembro(c, ws, "active", rol);
      }
      const { rows } = await c.query<{ n: string }>(
        `SELECT count(DISTINCT role) AS n FROM workspace_members WHERE workspace_id = $1`,
        [ws],
      );
      expect(Number(rows[0].n)).toBe(5);
    });
  });

  it("un estado inventado se rechaza con el nombre de la restriccion", async () => {
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");
      await c.query(SQL_590);
      await expect(meteMiembro(c, ws, "revoked")).rejects.toThrow(
        new RegExp(RESTRICCION),
      );
    });
  });

  it("el duplicado lo sigue impidiendo el indice unico, no esta restriccion", async () => {
    // Son dos protecciones distintas y conviene no confundirlas: si alguien
    // retirase el indice creyendo que la 590 cubre los duplicados, se podrian
    // meter dos pertenencias del mismo usuario al mismo workspace.
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");
      await c.query(SQL_590);
      const usuario = "11111111-2222-4000-8000-333333333333";
      const alta = (estado: string) =>
        c.query(
          `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
           VALUES ($1, $2, 'dup@ejemplo.test', 'member', $3, NOW()::text)`,
          [ws, usuario, estado],
        );
      await alta("active");
      await expect(alta("invited")).rejects.toThrow(/duplicate key|unique/i);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Los consumidores
  // ═════════════════════════════════════════════════════════════════════════

  it("`nelvyon_user_in_workspace` sigue resolviendo igual tras aplicarla", async () => {
    /**
     * Es la funcion que decide si un usuario ve los datos de un workspace, y
     * mira exactamente `wm.status = 'active'`. Si la 590 cambiara el valor
     * canonico, esta funcion dejaria de encontrar a nadie y el sintoma seria
     * «no veo mis datos», no «migracion mal».
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      const usuario = "99999999-8888-4000-8000-777777777777";
      await c.query(
        `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
         VALUES ($1, $2, 'c@ejemplo.test', 'member', 'active', NOW()::text)`,
        [ws, usuario],
      );
      await c.query(SQL_590);
      await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [usuario]);
      const { rows } = await c.query<{ dentro: boolean }>(
        `SELECT nelvyon_user_in_workspace($1) AS dentro`,
        [ws],
      );
      expect(rows[0].dentro, "tras la 590 un miembro activo deja de pertenecer a su workspace").toBe(
        true,
      );
    });
  });

  it("y sigue diciendo que NO a quien esta solo invitado", async () => {
    // La otra mitad: la 590 admite `invited` como estado valido, y eso no puede
    // convertirse en acceso.
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      const usuario = "66666666-5555-4000-8000-444444444444";
      await c.query(
        `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
         VALUES ($1, $2, 'i@ejemplo.test', 'member', 'invited', NOW()::text)`,
        [ws, usuario],
      );
      await c.query(SQL_590);
      await c.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [usuario]);
      const { rows } = await c.query<{ dentro: boolean }>(
        `SELECT nelvyon_user_in_workspace($1) AS dentro`,
        [ws],
      );
      expect(rows[0].dentro, "una invitacion pendiente da acceso a los datos").toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Cuanto dura y que bloquea
  // ═════════════════════════════════════════════════════════════════════════

  it("aplica en menos de dos segundos sobre mil filas", async () => {
    /**
     * No es una prueba de rendimiento: es una de forma. `ADD CONSTRAINT` ya
     * validado recorre la tabla con un bloqueo fuerte; el par NOT VALID +
     * VALIDATE existe justamente para no hacer eso. Si alguien quitara el
     * `NOT VALID`, esto no se notaria con mil filas... pero el numero queda
     * escrito y el comentario dice donde mirar.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await c.query(
        `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
         SELECT $1, gen_random_uuid()::text, 'm' || g || '@ejemplo.test', 'member',
                CASE WHEN g % 3 = 0 THEN 'invited' ELSE 'active' END, NOW()::text
           FROM generate_series(1, 1000) g`,
        [ws],
      );
      const t0 = Date.now();
      await c.query(SQL_590);
      expect(Date.now() - t0).toBeLessThan(2000);
    });
  });

  it("el bloqueo que toma es sobre workspace_members y nada mas", async () => {
    /**
     * Una migracion que bloqueara mas tablas de las que dice pararia partes del
     * producto que nadie relaciono con ella. Se miran los bloqueos de la propia
     * transaccion mientras esta abierta.
     */
    await enUnaTransaccionQueSeRevierte(async (c) => {
      const ws = await workspaceDePrueba(c);
      await meteMiembro(c, ws, "active", "owner");
      await c.query(SQL_590);
      const { rows } = await c.query<{ tabla: string; modo: string }>(
        `SELECT c.relname AS tabla, l.mode AS modo
           FROM pg_locks l JOIN pg_class c ON c.oid = l.relation
           JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
          WHERE l.pid = pg_backend_pid() AND c.relkind = 'r'
            AND l.mode IN ('ACCESS EXCLUSIVE', 'SHARE ROW EXCLUSIVE', 'EXCLUSIVE')
          ORDER BY 1`,
      );
      const bloqueadas = new Set(rows.map((r) => r.tabla));
      bloqueadas.delete("workspace_members");
      bloqueadas.delete("workspaces"); // la crea la propia prueba
      expect(
        [...bloqueadas],
        "la 590 bloquea tablas que no son suyas",
      ).toEqual([]);
    });
  });
});
