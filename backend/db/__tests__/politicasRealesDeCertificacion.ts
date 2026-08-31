/**
 * LAS MESAS DE CERTIFICACION DE RLS, CON LAS POLITICAS DE VERDAD.
 *
 * ── EL PROBLEMA QUE RESUELVE ────────────────────────────────────────────────
 *
 * Tres suites certifican que la base aisla a un inquilino de otro aunque la
 * consulta no lleve filtro: `rlsEfectivaWebApp`, `rlsFamiliasSaas` y
 * `elCutoverDelRolDelLadoWeb`. Las tres usan tablas `cert_*` propias, y por una
 * buena razon: comparten base con el resto de la suite y vitest ejecuta los
 * ficheros en paralelo, asi que sembrar sobre una tabla de producto convierte
 * el `TRUNCATE` de un fichero en el fallo de otro.
 *
 * Pero de esas tablas solo UNA se creaba sola. `cert_os_rls`, `cert_por_usuario`,
 * `cert_por_tenant_uuid`, `cert_por_ws_directo` y `cert_por_erp_text` no
 * existian en ningun fichero del arbol: se crearon a mano en alguna base local y
 * la certificacion de aislamiento dependia de objetos que nadie podia
 * reconstruir leyendo el repositorio.
 *
 * No se noto durante mucho tiempo porque sin DSN las suites se omitian, y una
 * prueba que no corre no puede quejarse. Al levantar PostgreSQL en local
 * fallaron 68 de golpe.
 *
 * ── POR QUE NO SE ESCRIBEN LAS POLITICAS A MANO ─────────────────────────────
 *
 * `elCutoverDelRolDelLadoWeb` ya avisa de esto en su propio comentario: si aqui
 * se inventara una politica mas simple, la suite mediria una politica de
 * juguete y no la que protege de verdad.
 *
 * Asi que no se escribe ninguna. Se LEEN del catalogo vivo —`pg_policies`— y se
 * aplican tal cual a la mesa de certificacion. Si manana una migracion cambia
 * la familia, la mesa cambia con ella y la suite sigue midiendo lo que decide.
 *
 * La eleccion no es arbitraria: para cada familia y cada operacion se toma el
 * predicado que cubre MAS tablas reales. La mayoria es abrumadora —202 tablas
 * frente a 1 o 2 excepciones— y ademas se exige un minimo, asi que si un dia la
 * familia se disuelve la derivacion falla en vez de certificar una excepcion
 * suelta creyendo que es la regla.
 *
 * ── QUE NO HACE ─────────────────────────────────────────────────────────────
 *
 * No crea funciones. `nelvyon_jwt_user_id`, `nelvyon_user_in_workspace` y las
 * demas vienen de las migraciones y ya estan en cualquier base migrada. Si
 * faltaran, esto falla con su nombre en vez de fabricar una version propia.
 *
 * COSTE EXTERNO: 0 EUR. Base local, datos sinteticos.
 */
import type { Client, Pool } from "pg";

type Ejecutor = Pick<Client | Pool, "query">;

/** Los sujetos sinteticos que comparten las suites de certificacion. */
export const USUARIO_A = "aaaaaaaa-1111-4000-8000-00000000000a";
export const USUARIO_B = "bbbbbbbb-2222-4000-8000-00000000000b";
export const AJENO = "cccccccc-3333-4000-8000-00000000000c";
export const TENANT_A = "11111111-aaaa-4000-8000-000000000001";
export const TENANT_B = "22222222-bbbb-4000-8000-000000000002";
export const WS_A = 101;
export const WS_B = 202;

/** Los roles del lado web a los que hay que conceder acceso a la mesa. */
const ROLES_WEB = ["nelvyon_web_app", "nelvyon_web_jobs"];

export type FamiliaReal = {
  /** Nombre legible, para los mensajes de fallo. */
  nombre: string;
  /** La funcion que identifica a la familia dentro del predicado de LECTURA. */
  marcador: string;
  /**
   * La funcion que identifica el predicado de MUTACION, si es distinta.
   *
   * NO ES UN DETALLE. La familia OS separa las dos: lee con
   * `nelvyon_os_workspace_select` —basta pertenecer— y escribe con
   * `nelvyon_os_workspace_mutate` —hace falta owner, admin u operator—. Buscar
   * la de escritura con el marcador de lectura no encuentra nada, y la
   * derivacion cae al predicado de lectura: la mesa quedaria dejando escribir a
   * un `viewer`.
   *
   * Eso paso de verdad en la primera version de este modulo, y lo caza el
   * control positivo del `viewer` en `rlsEfectivaWebApp`. Por eso el marcador
   * de mutacion es explicito.
   */
  marcadorMutacion?: string;
  /** La columna de dueño sobre la que decide la politica. */
  columna: string;
  /** El tipo SQL de esa columna en la mesa de certificacion. */
  tipo: string;
  /**
   * Cuantas tablas reales debe cubrir la familia como minimo.
   *
   * ES EL DENOMINADOR. Sin el, una familia que se quedara en una sola tabla
   * —o en cero— produciria una mesa con la politica de una excepcion, y la
   * suite aprobaria midiendo algo que no protege a casi nadie.
   */
  minimoTablas: number;
};

export const FAMILIAS_REALES: Record<string, FamiliaReal> = {
  porUsuario: {
    nombre: "por usuario (request.jwt.claim.sub)",
    marcador: "nelvyon_jwt_user_id",
    columna: "user_id",
    tipo: "text",
    minimoTablas: 100,
  },
  porTenantUuid: {
    nombre: "por tenant uuid derivado de saas_tenants",
    marcador: "nelvyon_current_saas_tenant_uuid",
    columna: "tenant_id",
    tipo: "uuid",
    minimoTablas: 60,
  },
  porWorkspaceDirecto: {
    nombre: "por workspace directo (app.tenant_id)",
    marcador: "current_tenant_id",
    columna: "workspace_id",
    tipo: "integer",
    minimoTablas: 10,
  },
  porErpTexto: {
    nombre: "por tenant texto ERP",
    marcador: "nelvyon_erp_tenant_text",
    columna: "tenant_id",
    tipo: "text",
    minimoTablas: 10,
  },
  porWorkspaceOs: {
    nombre: "OS por workspace (pertenencia + contexto)",
    marcador: "nelvyon_os_workspace_select",
    marcadorMutacion: "nelvyon_os_workspace_mutate",
    columna: "workspace_id",
    tipo: "integer",
    minimoTablas: 50,
  },
};

export type PredicadosReales = {
  seleccionar: string;
  insertar: string;
  actualizar: string;
  actualizarCheck: string;
  borrar: string;
  /** Cuantas tablas reales usan el predicado de SELECT elegido. */
  tablas: number;
};

/**
 * El predicado que MAS tablas reales usa, para una familia y una operacion.
 *
 * `columna` se exige ademas del marcador porque varias familias comparten
 * funcion: `current_tenant_id()` aparece tanto en politicas por `workspace_id`
 * como en excepciones sueltas que mezclan dos criterios con un OR.
 */
async function predicadoDominante(
  cli: Ejecutor,
  familia: FamiliaReal,
  cmd: "SELECT" | "INSERT" | "UPDATE" | "DELETE",
  campo: "qual" | "with_check",
): Promise<{ expr: string | null; tablas: number }> {
  const marcador = cmd === "SELECT" ? familia.marcador : (familia.marcadorMutacion ?? familia.marcador);
  /**
   * `cmd = 'ALL'` cuenta tambien, y no es un detalle.
   *
   * Una politica creada con `FOR ALL` aparece en `pg_policies` con `cmd='ALL'`
   * y gobierna las cuatro operaciones. Filtrando solo por `cmd='SELECT'` la
   * familia ERP —33 politicas, todas `FOR ALL`— salia como inexistente y la
   * derivacion fallaba diciendo que la familia era un fantasma.
   *
   * Se prefiere la politica especifica cuando la hay: si una tabla tiene a la
   * vez `FOR SELECT` y `FOR ALL`, la especifica es la que describe mejor la
   * intencion, y por eso ordena primero.
   */
  const { rows } = await cli.query<{ expr: string; tablas: number }>(
    `SELECT p.${campo} AS expr, count(DISTINCT p.tablename)::int AS tablas,
            bool_or(p.cmd = $1) AS especifica
       FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.cmd IN ($1, 'ALL')
        AND p.${campo} IS NOT NULL
        AND p.${campo} LIKE ('%' || $2 || '%')
        AND p.${campo} LIKE ('%' || $3 || '%')
      GROUP BY p.${campo}
      ORDER BY especifica DESC, tablas DESC
      LIMIT 1`,
    [cmd, marcador, familia.columna],
  );
  return { expr: rows[0]?.expr ?? null, tablas: rows[0]?.tablas ?? 0 };
}

/**
 * Los cinco predicados de una familia, leidos del catalogo.
 *
 * Falla con nombre si la familia no llega al minimo de tablas: es preferible un
 * rojo que explica la derivacion a una mesa construida sobre una excepcion.
 */
export async function predicadosRealesDe(
  cli: Ejecutor,
  familia: FamiliaReal,
): Promise<PredicadosReales> {
  const sel = await predicadoDominante(cli, familia, "SELECT", "qual");
  if (!sel.expr) {
    throw new Error(
      `no hay ninguna politica SELECT que use ${familia.marcador} sobre ${familia.columna}. ` +
        "O la base no esta migrada, o la familia ya no existe y esta prueba mide un fantasma.",
    );
  }
  if (sel.tablas < familia.minimoTablas) {
    throw new Error(
      `la familia «${familia.nombre}» solo cubre ${sel.tablas} tablas y se esperaban al menos ` +
        `${familia.minimoTablas}. Se estaria certificando una excepcion suelta creyendo que es la regla.`,
    );
  }

  const ins = await predicadoDominante(cli, familia, "INSERT", "with_check");
  const upd = await predicadoDominante(cli, familia, "UPDATE", "qual");
  const updChk = await predicadoDominante(cli, familia, "UPDATE", "with_check");
  const del = await predicadoDominante(cli, familia, "DELETE", "qual");

  /**
   * Una familia puede no separar mutacion de lectura; en ese caso se usa el de
   * lectura, que es exactamente lo que hace el producto: la misma condicion.
   *
   * Pero si la familia DECLARA marcador de mutacion y no se encuentra, caer al
   * de lectura seria abrir la escritura en silencio. Eso se corta aqui.
   */
  if (familia.marcadorMutacion && !ins.expr) {
    throw new Error(
      `la familia «${familia.nombre}» declara ${familia.marcadorMutacion} para mutar y no hay ` +
        "ninguna politica INSERT que lo use. Caer al predicado de lectura dejaria escribir a quien solo puede leer.",
    );
  }

  return {
    seleccionar: sel.expr,
    insertar: ins.expr ?? sel.expr,
    actualizar: upd.expr ?? sel.expr,
    actualizarCheck: updChk.expr ?? ins.expr ?? sel.expr,
    borrar: del.expr ?? sel.expr,
    tablas: sel.tablas,
  };
}

/**
 * Crea (o repara) la mesa de certificacion de una familia, con sus politicas.
 *
 * Es idempotente y no destruye nada: `CREATE TABLE IF NOT EXISTS` mas
 * `ADD COLUMN IF NOT EXISTS` para las columnas que falten, porque en una base
 * usada ya puede haber una version anterior con otra forma —paso exactamente
 * eso con `cert_cola`, que existia con solo `(id, status)` y hacia fallar seis
 * pruebas con `column "created_at" does not exist`—.
 */
export async function crearMesaDeCertificacion(
  cli: Ejecutor,
  opciones: {
    tabla: string;
    familia: FamiliaReal;
    /** Columnas extra, como `marca text` o `channel text`. */
    columnas?: readonly string[];
  },
): Promise<PredicadosReales> {
  const { tabla, familia, columnas = [] } = opciones;
  if (!/^cert_[a-z0-9_]+$/.test(tabla)) {
    // Todo lo que se crea aqui lleva politicas y GRANTs: que no pueda apuntar
    // por accidente a una tabla de producto.
    throw new Error(`«${tabla}» no es una mesa de certificacion (debe empezar por cert_)`);
  }

  const p = await predicadosRealesDe(cli, familia);

  await cli.query(
    `CREATE TABLE IF NOT EXISTS ${tabla} (
       id serial PRIMARY KEY,
       ${familia.columna} ${familia.tipo}
     )`,
  );
  await cli.query(
    `ALTER TABLE ${tabla} ADD COLUMN IF NOT EXISTS ${familia.columna} ${familia.tipo}`,
  );
  for (const columna of columnas) {
    await cli.query(`ALTER TABLE ${tabla} ADD COLUMN IF NOT EXISTS ${columna}`);
  }

  await cli.query(`ALTER TABLE ${tabla} ENABLE ROW LEVEL SECURITY`);
  // FORCE cierra ademas el bypass del propietario de la tabla: sin el, la
  // conexion de siembra veria las politicas como decorado.
  await cli.query(`ALTER TABLE ${tabla} FORCE ROW LEVEL SECURITY`);

  const politicas: ReadonlyArray<[string, string, string]> = [
    ["sel", "FOR SELECT", `USING (${p.seleccionar})`],
    ["ins", "FOR INSERT", `WITH CHECK (${p.insertar})`],
    ["upd", "FOR UPDATE", `USING (${p.actualizar}) WITH CHECK (${p.actualizarCheck})`],
    ["del", "FOR DELETE", `USING (${p.borrar})`],
  ];
  for (const [sufijo, para, cuerpo] of politicas) {
    await cli.query(`DROP POLICY IF EXISTS ${tabla}_${sufijo} ON ${tabla}`);
    await cli.query(`CREATE POLICY ${tabla}_${sufijo} ON ${tabla} ${para} ${cuerpo}`);
  }

  for (const rol of ROLES_WEB) {
    await cli.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${tabla} TO ${rol}`);
    await cli.query(`GRANT USAGE, SELECT ON SEQUENCE ${tabla}_id_seq TO ${rol}`);
  }

  return p;
}

/**
 * Siembra los sujetos que las funciones de politica necesitan para resolver.
 *
 * NO SON DATOS DE ADORNO. `nelvyon_user_in_workspace` mira `workspaces` y
 * `workspace_members`; `nelvyon_current_saas_tenant_uuid` mira `saas_tenants`.
 * Sin estas filas las politicas denegarian SIEMPRE, y las pruebas negativas
 * pasarian todas sin que nada estuviera aislando: el aprobado falso de siempre.
 * Por eso cada suite lleva sus controles positivos.
 *
 * `workspace_members` se siembra con `status = 'active'` porque es lo que exige
 * la funcion real, y coincide con el contrato que fija la migracion 590.
 *
 * PERO PARA ESTOS SUJETOS ESA FILA ES REDUNDANTE, y conviene saberlo. La
 * funcion acepta por dos vias unidas con OR —ser dueño en `workspaces`, o ser
 * miembro activo—, y A y B son ademas dueños, asi que entran por la primera.
 * Se comprobo con una mutacion: cambiar esta siembra a `invited` no rompe
 * ninguna prueba.
 *
 * No es un hueco de cobertura: la rama de pertenencia la cubre aparte la prueba
 * «la pertenencia solo cuenta si esta `active`» de `rlsEfectivaWebApp`, que usa
 * un usuario que NO es dueño de nada y se administra su propia fila. La
 * siembra se queda porque hace el escenario realista, no porque decida nada.
 *
 * No se borra nada de estas tablas al terminar: se usan `ON CONFLICT DO NOTHING`
 * e ids fijos, porque otras suites corren en paralelo contra la misma base y un
 * `DELETE` aqui seria el mismo error de fixture compartido que se vino a evitar.
 */
export async function sembrarSujetosReales(cli: Ejecutor): Promise<void> {
  for (const [id, usuario] of [
    [WS_A, USUARIO_A],
    [WS_B, USUARIO_B],
  ] as const) {
    await cli.query(
      `INSERT INTO workspaces (id, user_id, name, slug, status, plan, created_at)
       VALUES ($1, $2, $3, $4, 'active', 'starter', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, usuario, `cert-ws-${id}`, `cert-ws-${id}`],
    );
    await cli.query(
      // Los tipos van explicitos: sin ellos `$2` aparece en la lista del SELECT
      // —donde no tiene tipo— y en la comparacion con `user_id` —varchar—, y
      // PostgreSQL responde «inconsistent types deduced for parameter $2».
      `INSERT INTO workspace_members (workspace_id, user_id, email, role, status, created_at)
       SELECT $1::integer, $2::text, $3::text, 'owner', 'active', NOW()::text
        WHERE NOT EXISTS (
          SELECT 1 FROM workspace_members
           WHERE workspace_id = $1::integer AND user_id = $2::text
        )`,
      [id, usuario, `cert-${id}@ejemplo.test`],
    );
  }

  // La secuencia tiene que quedar por encima de los ids fijos, o el siguiente
  // INSERT sin id de cualquier otra prueba chocaria contra la clave primaria.
  await cli.query(
    `SELECT setval('workspaces_id_seq', GREATEST((SELECT COALESCE(MAX(id),0) FROM workspaces), $1))`,
    [WS_B],
  );

  /**
   * `saas_tenants.user_id` referencia `nelvyon_users(user_id)`, asi que el
   * usuario tiene que existir antes que el inquilino.
   *
   * `password_hash` es NOT NULL y se rellena con un texto que NO es un hash:
   * no tiene el formato de bcrypt ni de nada que el verificador acepte, asi que
   * no puede autenticar a nadie ni por accidente. No es una credencial
   * inventada; es un relleno que se delata solo al leerlo.
   */
  for (const usuario of [USUARIO_A, USUARIO_B] as const) {
    await cli.query(
      `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name)
       VALUES ($1, $2, 'sin-hash-datos-sinteticos-de-certificacion', $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [usuario, `cert-${usuario.slice(0, 8)}@ejemplo.test`, `Certificacion ${usuario.slice(0, 8)}`],
    );
  }

  for (const [tenant, usuario] of [
    [TENANT_A, USUARIO_A],
    [TENANT_B, USUARIO_B],
  ] as const) {
    await cli.query(
      `INSERT INTO saas_tenants (id, user_id, company_name, industry)
       VALUES ($1, $2, $3, 'certificacion')
       ON CONFLICT (id) DO NOTHING`,
      [tenant, usuario, `cert-tenant-${tenant.slice(0, 8)}`],
    );
  }
}
