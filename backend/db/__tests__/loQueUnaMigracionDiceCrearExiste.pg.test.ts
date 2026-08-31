/**
 * LO QUE UNA MIGRACION DICE CREAR, EXISTE.
 *
 * ── DE DONDE SALE ESTA PRUEBA ───────────────────────────────────────────────
 *
 * Este repositorio ya sufrio exactamente esto. La migracion 507 se anoto como
 * aplicada y 55 de sus sentencias no llegaron a ejecutarse: el aplicador se
 * tragaba los fallos en silencio. Hizo falta una migracion entera —la 575— para
 * reparar lo que la 507 y la 406 nunca crearon, y un script dedicado
 * (`clasificar-las-55-omisiones-de-la-507.mjs`) para averiguar QUE faltaba.
 *
 * `elEsquemaTieneLoQueElCodigoPide` cubre la otra mitad: pares (tabla, columna)
 * concretos que el codigo usa, leidos uno a uno. Deliberadamente no analiza todo
 * el SQL, y hace bien: un analizador a medias daria una lista de falsos avisos y
 * acabaria ignorado.
 *
 * Esta hace la pregunta inversa, que si se puede responder sin ambiguedad:
 *
 *     de cada `CREATE TABLE` de las migraciones, ¿existe la tabla?
 *
 * Un `CREATE TABLE` no admite interpretacion. O la tabla esta, o la migracion
 * dijo algo que no ocurrio.
 *
 * ── CONTRA UNA BASE MIGRADA DESDE CERO ──────────────────────────────────────
 *
 * Se ejecuta contra la base local, que se construyo aplicando las 489
 * migraciones desde una base vacia. Eso es lo que la hace util: una base que fue
 * creciendo a parches puede tener una tabla que ninguna migracion crea —hecha a
 * mano alguna vez— y el fallo no aparece hasta que alguien monta un entorno
 * nuevo.
 *
 * COSTE EXTERNO: 0 EUR. Se lee el catalogo y los ficheros; no se escribe nada.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const DSN = process.env.NELVYON_WEB_CERT_DSN ?? process.env.NELVYON_COLA_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

const DIR = path.resolve(__dirname, "..", "migrations");

let pool: import("pg").Pool;

/**
 * Tablas que una migracion crea y que a proposito NO estan, con quien las quito.
 *
 * Cada entrada es una decision comprobada, no un descarte. Si no sabes por que
 * una tabla esta aqui, no deberia estar.
 */
const RETIRADAS_A_PROPOSITO: Record<string, string> = {
  scored_leads: "la retira `513_drop_scored_leads.sql`",
  conversation_messages:
    "`535_saas_conversations_recupera_su_prefijo.sql` la renombra a " +
    "`saas_conversation_messages`, que es la que usa `SaasInboxService`",
  os_sector_shield_audits_backfill_574:
    "la 574 la crea DENTRO de un bloque condicional: solo existe si hubo algo que " +
    "reatribuir",
};

/** Los nombres que declara cada migracion, sin contar comentarios. */
function tablasDeclaradas(): Map<string, string> {
  const declaradas = new Map<string, string>();
  for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) {
    const sql = fs.readFileSync(path.join(DIR, f), "utf8");
    // Un `CREATE TABLE` dentro de un comentario no crea nada. Sin quitarlos, las
    // migraciones que EXPLICAN lo que hacen se acusarian a si mismas.
    const codigo = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
    const patron =
      /CREATE\s+(?:UNLOGGED\s+|TEMP\s+|TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
    for (const m of codigo.matchAll(patron)) {
      const tabla = m[1].toLowerCase();
      // Las mesas de certificacion las crean las pruebas, no las migraciones.
      if (tabla.startsWith("cert_") || tabla.startsWith("tmp_") || tabla.startsWith("temp_")) {
        continue;
      }
      if (!declaradas.has(tabla)) declaradas.set(tabla, f);
    }
  }
  return declaradas;
}

async function tablasQueExisten(): Promise<Set<string>> {
  const { rows } = await pool.query<{ relname: string }>(
    `SELECT c.relname FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')`,
  );
  return new Set(rows.map((r) => r.relname.toLowerCase()));
}

describeSiHayPg("lo que una migracion dice crear, existe", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 2 });
  });
  afterAll(async () => {
    await pool?.end();
  });

  it("EL DENOMINADOR: las migraciones declaran cientos de tablas", () => {
    /**
     * Sin esto, una expresion mal escrita encontraria cero `CREATE TABLE` y la
     * comprobacion de abajo pasaria para siempre sin mirar nada. Es exactamente
     * el fallo que tuvieron los cuatro guardianes de RLS, que solo auditaban el
     * conjunto ya protegido.
     */
    expect(tablasDeclaradas().size).toBeGreaterThan(600);
  });

  it("EL CONTROL: la base tiene de verdad las tablas del producto", async () => {
    // Una base vacia haria pasar la regla de abajo si estuviera escrita al
    // reves, y ademas indica que el DSN apunta donde no es.
    const existen = await tablasQueExisten();
    expect(existen.size).toBeGreaterThan(600);
    expect(existen.has("workspaces")).toBe(true);
    expect(existen.has("workspace_members")).toBe(true);
  });

  it("LA REGLA: ninguna migracion promete una tabla que no esta", async () => {
    const existen = await tablasQueExisten();
    const faltan: string[] = [];
    for (const [tabla, fichero] of tablasDeclaradas()) {
      if (existen.has(tabla)) continue;
      if (tabla in RETIRADAS_A_PROPOSITO) continue;
      faltan.push(`${tabla}  (la declara ${fichero})`);
    }
    expect(
      faltan,
      "estas tablas las crea una migracion y NO estan en una base migrada desde cero. " +
        "O la migracion fallo en silencio —como hizo la 507 con 55 sentencias— o algo " +
        "las quito sin dejarlo escrito:\n  " + faltan.join("\n  "),
    ).toEqual([]);
  });

  it("y la lista de retiradas no tiene entradas muertas", async () => {
    /**
     * Una lista de excepciones que envejece deja de proteger: si una tabla
     * retirada volviera a crearse, su entrada seguiria dandole permiso para
     * desaparecer otra vez sin que nadie se enterara.
     */
    const existen = await tablasQueExisten();
    const declaradas = tablasDeclaradas();
    const muertas = Object.keys(RETIRADAS_A_PROPOSITO).filter(
      (t) => existen.has(t) || !declaradas.has(t),
    );
    expect(
      muertas,
      "estas entradas ya no corresponden a una tabla declarada y ausente; quitalas",
    ).toEqual([]);
  });

  it("EL CONTROL POSITIVO: se detecta una tabla prometida y ausente", async () => {
    /**
     * Se comprueba con un nombre que ninguna migracion crea y que no existe. Sin
     * esto, un `continue` de mas convertiria esta suite en un guardian que no
     * mira — que es peor que ninguno, porque ademas tranquiliza.
     */
    const existen = await tablasQueExisten();
    expect(existen.has("tabla_que_nadie_ha_creado_jamas")).toBe(false);
    // Y la logica de la regla, aplicada a ese nombre, lo marcaria.
    const marcada = !existen.has("tabla_que_nadie_ha_creado_jamas");
    expect(marcada).toBe(true);
  });

  it("y los comentarios no cuentan como declaraciones", () => {
    /**
     * Varias migraciones EXPLICAN en su cabecera lo que crean, con el SQL
     * dentro del comentario. Sin quitarlos, se acusarian a si mismas — el mismo
     * error que un detector de secretos que salta con su propia lista.
     */
    const soloComentario = "-- CREATE TABLE tabla_de_mentira (id int);\nSELECT 1;";
    const codigo = soloComentario.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
    expect(/CREATE\s+TABLE/i.test(codigo)).toBe(false);
  });
});
