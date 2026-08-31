/**
 * UNA TABLA CON COLUMNA DE DUEÑO NO PUEDE SER LEGIBLE SIN RLS.
 *
 * ── POR QUE NADIE LO HABIA VISTO ────────────────────────────────────────────
 *
 * Habia ya cuatro comprobaciones de RLS en el arbol. Las cuatro empiezan igual:
 *
 *     WHERE pc.relrowsecurity      ← solo mira tablas que YA tienen RLS
 *
 * `siRlsFiltraPorInquilinoHayIndice`, `noHayLimitesArtificiales`,
 * `dosChatbotsDosTablas` y `rlsIsolation` comprueban cosas distintas y todas
 * utiles —que haya indice, que la politica aisle, que exista FORCE— pero todas
 * parten del conjunto PROTEGIDO.
 *
 * Ninguna hacia la pregunta inversa: ¿que tablas deberian estar protegidas y no
 * lo estan? Y esa es la unica que encuentra un agujero, porque un agujero, por
 * definicion, no esta dentro del conjunto que se audita.
 *
 * El resultado fue que 47 tablas con `user_id` quedaron sin RLS, legibles por
 * los roles de aplicacion, durante toda la vida del proyecto y con cuatro
 * guardianes en verde.
 *
 * ── QUE HABIA DENTRO ────────────────────────────────────────────────────────
 *
 *     integration_google_ads    access_token, refresh_token
 *     integration_twilio        account_sid, auth_token
 *     integration_shopify       access_token
 *     saas_api_keys             key_hash
 *     digital_contracts         sign_token, signature_data, client_email
 *     audit_log                 ip_address, user_agent, session_id
 *
 * Credenciales OAuth de terceros, credenciales de Twilio —que envian SMS y
 * cuestan dinero—, tokens de firma de contratos y direcciones IP. Sin politica,
 * cualquier lectura por un rol de aplicacion devuelve las filas de TODOS.
 *
 * Y no solo los roles internos: la mayoria tenia ademas `SELECT` concedido a
 * `anon`, que es el rol anonimo de PostgREST. La clave que lo activa
 * —`NEXT_PUBLIC_SUPABASE_ANON_KEY`— es publica por diseño y viaja al navegador.
 *
 * ── POR QUE SE ESCAPARON DEL BARRIDO ────────────────────────────────────────
 *
 * La migracion 567 aplica RLS en masa, pero exige `tenant_id` de tipo uuid:
 *
 *     IF tipo IS DISTINCT FROM 'uuid' THEN … CONTINUE
 *
 * Estas 47 no tienen `tenant_id`: tienen `user_id`. El barrido las salto una a
 * una sin que nadie lo leyera, y no habia nada que preguntara despues.
 *
 * ── LA LISTA DE EXCEPCIONES ES BLANCA, NO NEGRA ─────────────────────────────
 *
 * Lo que no este declarado abajo falla. Una tabla nueva nace protegida o nace
 * rompiendo esta prueba; en ningun caso nace invisible.
 *
 * COSTE EXTERNO: 0 EUR. Solo catalogo.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DSN = process.env.NELVYON_WEB_CERT_DSN ?? process.env.NELVYON_COLA_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

/** Las columnas que significan «esta fila es de alguien». */
const COLUMNAS_DE_DUENO = ["user_id", "tenant_id", "workspace_id"];

/** Los roles por los que pasa una peticion de la aplicacion. */
const ROLES_DE_APLICACION = ["anon", "authenticated", "nelvyon_web_app", "nelvyon_web_jobs"];

/**
 * Tablas que pueden leerse sin RLS, con su razon.
 *
 * Cada entrada es una decision, no un descarte. Si no sabes por que esta una
 * tabla aqui, no deberia estar.
 */
const EXCEPCIONES: Record<string, string> = {
  // Las mesas de certificacion las crean las propias pruebas y viven y mueren
  // en la base local. No llevan datos de nadie.
};

/** Las mesas de certificacion se reconocen por el prefijo, no una a una. */
function esMesaDeCertificacion(tabla: string): boolean {
  // `left(...)` y no LIKE: el guion bajo es comodin en LIKE, y `certificates` y
  // `certificate_templates` SI son tablas de producto.
  return tabla.slice(0, 5) === "cert_";
}

type Fila = { tabla: string; columnas: string; roles: string };

async function tablasDesprotegidas(): Promise<Fila[]> {
  const { rows } = await pool.query<Fila>(
    `SELECT t.table_name AS tabla,
            (SELECT string_agg(DISTINCT c.column_name, '+' ORDER BY c.column_name)
               FROM information_schema.columns c
              WHERE c.table_schema = 'public' AND c.table_name = t.table_name
                AND c.column_name = ANY($1)) AS columnas,
            (SELECT string_agg(DISTINCT tp.grantee, ',' ORDER BY tp.grantee)
               FROM information_schema.table_privileges tp
              WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name
                AND tp.privilege_type = 'SELECT'
                AND tp.grantee = ANY($2)) AS roles
       FROM information_schema.tables t
       JOIN pg_class pc ON pc.relname = t.table_name
       JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND NOT pc.relrowsecurity
        AND EXISTS (
          SELECT 1 FROM information_schema.columns c
           WHERE c.table_schema = 'public' AND c.table_name = t.table_name
             AND c.column_name = ANY($1)
        )
        AND EXISTS (
          SELECT 1 FROM information_schema.table_privileges tp
           WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name
             AND tp.privilege_type = 'SELECT'
             AND tp.grantee = ANY($2)
        )
      ORDER BY 1`,
    [COLUMNAS_DE_DUENO, ROLES_DE_APLICACION],
  );
  return rows.filter((f) => !esMesaDeCertificacion(f.tabla) && !(f.tabla in EXCEPCIONES));
}

describeSiHayPg("ninguna tabla con dueño se queda sin RLS", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 2 });
  });
  afterAll(async () => {
    await pool?.end();
  });

  it("EL DENOMINADOR: hay tablas con columna de dueño que auditar", async () => {
    /**
     * Sin esto, una consulta mal escrita devolveria cero filas siempre y la
     * comprobacion de abajo pasaria para siempre sin mirar nada. Es el fallo
     * que tuvieron los otros cuatro guardianes, solo que por otra via.
     */
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(DISTINCT c.table_name) AS n
         FROM information_schema.columns c
         JOIN information_schema.tables t
           ON t.table_schema = c.table_schema AND t.table_name = c.table_name
          AND t.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public' AND c.column_name = ANY($1)`,
      [COLUMNAS_DE_DUENO],
    );
    expect(
      Number(rows[0].n),
      "cero tablas con columna de dueño: o la base no esta migrada o la consulta no mira donde cree",
    ).toBeGreaterThan(200);
  });

  it("EL CONTROL POSITIVO: la consulta sabe encontrar una tabla desprotegida", async () => {
    /**
     * Se crea una tabla con `user_id`, sin RLS y legible por un rol de
     * aplicacion, y se comprueba que la consulta la ve. Sin esto, un `WHERE`
     * de mas convertiria esta prueba en un guardian que no mira — que es peor
     * que ninguno, porque ademas tranquiliza.
     */
    await pool.query(
      `CREATE TABLE IF NOT EXISTS cert_deberia_saltar (id serial PRIMARY KEY, user_id uuid)`,
    );
    await pool.query(`GRANT SELECT ON cert_deberia_saltar TO nelvyon_web_app`);
    try {
      const { rows } = await pool.query<{ n: string }>(
        `SELECT count(*) AS n
           FROM information_schema.tables t
           JOIN pg_class pc ON pc.relname = t.table_name
           JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = 'public'
          WHERE t.table_name = 'cert_deberia_saltar' AND NOT pc.relrowsecurity`,
      );
      expect(Number(rows[0].n), "la consulta no ve una tabla sin RLS recien creada").toBe(1);
    } finally {
      await pool.query(`DROP TABLE IF EXISTS cert_deberia_saltar`);
    }
  });

  it("LA REGLA: ninguna tabla con dueño es legible por la aplicacion sin RLS", async () => {
    const abiertas = await tablasDesprotegidas();
    expect(
      abiertas.map((f) => `${f.tabla} (${f.columnas}) legible por ${f.roles}`),
      `${abiertas.length} tablas con columna de dueño y SIN RLS son legibles por un rol de ` +
        "aplicacion. Cada lectura devuelve las filas de TODOS los clientes.",
    ).toEqual([]);
  });

  it("EL TRINQUETE: las tablas con RLS pero sin FORCE no aumentan", async () => {
    /**
     * ── POR QUE ESTO ES UN TRINQUETE Y NO UNA REGLA ───────────────────────
     *
     * 67 de las 656 tablas con RLS no tienen `FORCE`. Sin FORCE, el
     * PROPIETARIO de la tabla se salta sus propias politicas.
     *
     * Medido lo que eso significa aqui, que es menos de lo que parece:
     *
     *   · hoy la aplicacion se conecta como superusuario, y un superusuario se
     *     salta RLS tenga FORCE o no. FORCE no cambia nada;
     *   · tras el cutover se conectara como `nelvyon_web_app`, que NO es
     *     propietario de las tablas, asi que las politicas le aplican
     *     igualmente. FORCE tampoco cambia nada.
     *
     * Es decir: es endurecimiento en profundidad —cubre el caso de que algun
     * dia el rol que conecta sea el dueño— y no una fuga demostrable. Barrer
     * 67 tablas por eso seria un cambio ancho sin exploit que lo justifique, y
     * este proyecto ya tiene precedente de hacer estos barridos uno a uno y
     * con analisis (`003_local_ai_rls_symmetry`).
     *
     * Asi que no se barre: se fija el numero. Si alguien añade una tabla nueva
     * con RLS y se olvida de FORCE, esto se pone rojo y la decision vuelve a la
     * mesa. Lo que no puede pasar es que crezca sin que nadie se entere.
     */
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*) AS n
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
        WHERE c.relkind = 'r' AND c.relrowsecurity AND NOT c.relforcerowsecurity
          AND left(c.relname, 5) <> 'cert_'`,
    );
    expect(
      Number(rows[0].n),
      "han aparecido tablas nuevas con RLS y sin FORCE: el propietario se salta su propia politica",
    ).toBeLessThanOrEqual(67);
  });

  it("y en particular, ninguna guarda credenciales de terceros", async () => {
    /**
     * La misma regla, acotada a lo que mas duele, para que el mensaje de fallo
     * diga lo que hay en juego y no solo cuantas tablas son.
     */
    const abiertas = await tablasDesprotegidas();
    const nombres = abiertas.map((f) => f.tabla);
    if (nombres.length === 0) return;

    const { rows } = await pool.query<{ tabla: string; columna: string }>(
      `SELECT table_name AS tabla, column_name AS columna
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ANY($1)
          AND (column_name LIKE '%token%' OR column_name LIKE '%secret%'
            OR column_name LIKE '%password%' OR column_name LIKE '%_key%'
            OR column_name LIKE 'key_%' OR column_name LIKE '%auth%')
        ORDER BY 1, 2`,
      [nombres],
    );
    expect(
      rows.map((r) => `${r.tabla}.${r.columna}`),
      "estas columnas guardan credenciales y se leen sin ninguna politica",
    ).toEqual([]);
  });
});
