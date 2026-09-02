/**
 * SOLO LECTURA. Tres preguntas que ninguna clave foranea responde en esta base.
 *
 * `workspaces` y `workspace_members` NO TIENEN NINGUNA CLAVE FORANEA. Medido,
 * no supuesto: `pg_constraint` devuelve cero para ambas. Eso significa que la
 * base acepta, sin protestar:
 *
 *   1. un workspace cuyo dueño no existe como usuario;
 *   2. una pertenencia a un workspace que no existe;
 *   3. una pertenencia de un usuario que no existe.
 *
 * Y una cuarta que no es de integridad referencial pero duele mas:
 *
 *   4. un workspace ACTIVO sin ninguna pertenencia activa de dueño.
 *
 * POR QUE LA CUARTA IMPORTA MAS DE LO QUE PARECE
 * -----------------------------------------------
 * `nelvyon_user_in_workspace` —el predicado del que cuelga toda la RLS por
 * workspace— exige una fila de pertenencia ACTIVA. NO mira `workspaces.user_id`.
 *
 * Asi que un workspace sin esa fila es un workspace al que su propio dueño no
 * puede entrar. Hoy no se nota porque la aplicacion se conecta como `postgres`,
 * que salta RLS. El dia del cutover a `nelvyon_web_app`, esos duenos se quedan
 * fuera de su propio espacio, y el sintoma sera «no veo nada», no un error.
 *
 * Ademas `BILLABLE_SEATS` cuenta pertenencias activas: un workspace sin ellas
 * factura cero asientos mientras alguien lo usa.
 *
 * NO ESCRIBE NADA. Transaccion READ ONLY. No imprime la cadena de conexion ni
 * identificadores completos de usuario.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import pg from "pg";

const CANDIDATOS = ["DATABASE_PUBLIC_URL", "POSTGRES_PUBLIC_URL", "DATABASE_URL", "POSTGRES_URL"];
const nombre = CANDIDATOS.find((n) => (process.env[n] ?? "").trim().length > 0);
if (!nombre) {
  console.error(JSON.stringify({ ok: false, error: "sin cadena de conexion" }));
  process.exit(2);
}
const u = new URL(process.env[nombre]);
const cli = new pg.Client({
  connectionString: process.env[nombre],
  ssl: process.env.PGSSL === "0" ? false : { rejectUnauthorized: false },
  statement_timeout: 30_000,
});

const salida = { ok: true, destino: `${u.hostname}:${u.port}${u.pathname}` };
try {
  await cli.connect();
  await cli.query("BEGIN TRANSACTION READ ONLY");
  const q = async (sql) => (await cli.query(sql)).rows;

  salida.clavesForaneas = {
    workspaces: (await q(
      `SELECT count(*)::int c FROM pg_constraint WHERE conrelid='workspaces'::regclass AND contype='f'`,
    ))[0].c,
    workspace_members: (await q(
      `SELECT count(*)::int c FROM pg_constraint WHERE conrelid='workspace_members'::regclass AND contype='f'`,
    ))[0].c,
  };

  // 1. Workspaces cuyo dueño no es un usuario.
  salida.duenoFantasma = await q(`
    SELECT w.id, w.name, w.status, left(w.user_id::text, 8) AS dueno_prefijo
      FROM workspaces w
     WHERE NOT EXISTS (SELECT 1 FROM nelvyon_users u WHERE u.user_id::text = w.user_id::text)
     ORDER BY w.id`);

  // 2 y 3. Pertenencias huerfanas.
  salida.pertenenciaSinWorkspace = (await q(`
    SELECT count(*)::int c FROM workspace_members m
     WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = m.workspace_id)`))[0].c;
  salida.pertenenciaSinUsuario = (await q(`
    SELECT count(*)::int c FROM workspace_members m
     WHERE NOT EXISTS (SELECT 1 FROM nelvyon_users u WHERE u.user_id::text = m.user_id::text)`))[0].c;

  // 4. La que deja al dueño fuera tras el cutover.
  salida.workspaceSinDuenoActivo = await q(`
    SELECT w.id, w.name, w.status, w.plan,
           left(w.user_id::text, 8) AS dueno_prefijo,
           EXISTS (SELECT 1 FROM nelvyon_users u WHERE u.user_id::text = w.user_id::text) AS dueno_es_usuario,
           (SELECT count(*)::int FROM workspace_members m WHERE m.workspace_id = w.id) AS pertenencias
      FROM workspaces w
     WHERE w.status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM workspace_members m
          WHERE m.workspace_id = w.id
            AND m.user_id::text = w.user_id::text
            AND lower(coalesce(m.status,'')) = 'active')
     ORDER BY w.id`);

  salida.resumen = {
    workspaces: (await q("SELECT count(*)::int c FROM workspaces"))[0].c,
    pertenencias: (await q("SELECT count(*)::int c FROM workspace_members"))[0].c,
    usuarios: (await q("SELECT count(*)::int c FROM nelvyon_users"))[0].c,
  };
  await cli.query("ROLLBACK");
} catch (e) {
  salida.ok = false;
  salida.error = e instanceof Error ? e.message : String(e);
} finally {
  await cli.end().catch(() => {});
}

console.log(JSON.stringify(salida, null, 1));
process.exit(salida.ok ? 0 : 1);
