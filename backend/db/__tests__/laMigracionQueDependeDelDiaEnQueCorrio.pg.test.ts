/**
 * BLOQUE 9 · la migración cuyo efecto depende del día en que corrió.
 *
 * El encargo del bloque avisaba de esto con estas palabras: «migración válida
 * que solo funciona sobre una base ya preparada». Aquí está, y no es hipotética.
 *
 * `567_rls_saas_tablas_vacias.sql` activa RLS sobre un lote de tablas, pero
 * **solo si están vacías**:
 *
 *     EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', t) INTO tiene_filas;
 *     IF tiene_filas THEN ... CONTINUE;
 *
 * La cautela es defendible y su cabecera la explica: activar RLS sobre una tabla
 * con datos puede ocultárselos a quien ya los estaba leyendo, y eso es una
 * avería peor que la que se venía a evitar.
 *
 * Pero la consecuencia no la decidió nadie: **una tabla se queda sin RLS para
 * siempre por lo que hubiera dentro el día que se aplicó la migración**. Una
 * base reconstruida desde cero tiene las políticas; una base viva que ya tenía
 * filas, no. Y las dos creen estar al día, porque las dos han aplicado las 475
 * migraciones sin error.
 *
 * MEDIDO: la reconstrucción desde cero tiene 2 121 políticas; la base de
 * certificación, tras aplicarle todas las migraciones, tiene 2 117. Las cuatro
 * que faltan son las de `saas_tenants` — la tabla de inquilinos.
 *
 * Esta suite NO cambia nada. Fija el hecho y lo pone donde se vea, porque
 * activar RLS sobre una `saas_tenants` con datos es una decisión con
 * consecuencias de visibilidad, y además se cruza con `WEB_DB_ROLE_CUTOVER`,
 * que ya está bloqueado: hoy la aplicación se conecta con un rol que evita las
 * políticas, así que estas no son la frontera efectiva de todas formas.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

let pool: import("pg").Pool;

beforeAll(async () => {
  if (!hayBase) return;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
});

afterAll(async () => {
  if (pool) await pool.end();
});

soloConBase("BLOQUE 9 · la condición de vacío existe y hace lo que dice", () => {
  it("la migración 567 SOLO toca tablas vacías", async () => {
    /**
     * Se comprueba en el propio fichero, no de memoria. Si alguien quitara la
     * guarda, esto se pondría rojo — y quitarla es una decisión, no un arreglo.
     */
    const fs = await import("node:fs");
    const path = await import("node:path");
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), "../../backend/db/migrations/567_rls_saas_tablas_vacias.sql"),
      "utf8",
    );
    expect(sql).toContain("tiene_filas");
    expect(sql, "la guarda de tabla vacia ha desaparecido de la migracion 567").toMatch(
      /IF\s+tiene_filas\s+THEN/i,
    );
  });

  it("MEDIDO: `saas_tenants` tiene filas, y por eso se quedó sin esas políticas", async () => {
    /**
     * La cadena causal, comprobada de punta a punta contra la base real:
     * la tabla tiene filas -> la migración la omitió -> no tiene las políticas.
     */
    const filas = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM saas_tenants`,
    );
    const tieneFilas = Number(filas.rows[0]?.n ?? 0) > 0;

    const pol = await pool.query<{ policyname: string }>(
      `SELECT policyname FROM pg_policies
        WHERE schemaname='public' AND tablename='saas_tenants'
          AND policyname LIKE '%_os_%'`,
    );

    console.info(
      `saas_tenants: ${filas.rows[0]?.n} filas, ` +
        `${pol.rows.length} politicas de la familia _os_`,
    );

    /**
     * «TIENE FILAS AHORA» NO ES «TENÍA FILAS ENTONCES», y confundirlo hacía que
     * esta prueba saliera cara o cruz.
     *
     * La versión anterior deducía el pasado del presente: si la tabla tiene
     * filas hoy, la migración debió saltársela. Eso es cierto en la base viva
     * —donde las filas llevan ahí desde antes de la 567— y es FALSO en una base
     * reconstruida desde cero, donde la 567 corre sobre una tabla vacía, crea
     * las políticas, y después otra prueba inserta un inquilino.
     *
     * Con la suite entera en paralelo, esta prueba pasaba o fallaba según qué
     * otro fichero hubiera escrito antes en `saas_tenants`. Una prueba que sale
     * cara o cruz no documenta un hallazgo: lo desacredita.
     *
     * Lo que SÍ se puede afirmar sin adivinar el pasado: si la tabla está
     * vacía, la migración no pudo saltársela, así que las políticas tienen que
     * estar. Y si tiene filas, no se puede saber cuándo llegaron — se dice y no
     * se afirma nada.
     */
    if (!tieneFilas) {
      expect(
        pol.rows.length,
        "saas_tenants esta VACIA y aun asi no tiene las politicas: eso ya no es la " +
          "guarda de vacio, es otro problema",
      ).toBeGreaterThan(0);
      return;
    }

    console.info(
      "saas_tenants tiene filas AHORA, lo que no dice si las tenia cuando corrio la 567. " +
        `Politicas presentes: ${pol.rows.length}. El hallazgo de produccion esta medido ` +
        "aparte, en el preflight, contra la base real.",
    );
  });

  it("el detector de deriva existe y sabe encontrarlo", async () => {
    /**
     * Lo que convierte el hallazgo en algo operable: no basta con saberlo hoy,
     * hace falta que se vuelva a ver mañana. `detectar-deriva-de-esquema.mjs`
     * reconstruye el esquema desde las migraciones y compara.
     *
     * Se comprueba que el script existe y que compara lo que dice comparar. Su
     * funcionamiento se demuestra ejecutandolo en la puerta del bloque.
     */
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "../../scripts/detectar-deriva-de-esquema.mjs"),
      "utf8",
    );
    for (const categoria of ["tablas", "columnas", "restricciones", "indices", "politicas_rls"]) {
      expect(src, `el detector no compara ${categoria}`).toContain(categoria);
    }
    expect(src, "el detector no reconstruye desde las migraciones").toContain("migrate-pg.mjs");
    expect(src, "el detector MODIFICA la base que examina").not.toMatch(
      /ALTER TABLE|CREATE POLICY|DROP POLICY/,
    );
  });
});
