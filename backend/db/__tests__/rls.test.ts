// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { getSupabaseAnonKey, assertNoServiceRoleKeyExposedInBrowser } from "../../../apps/web/src/lib/supabaseClient";

const dbRoot = join(__dirname, "..");

describe("RLS audit (MIG 279)", () => {
  // Esta prueba EXIGIA que `DbClient.ts` contuviera la palabra `service_role` y
  // la frase «NEVER use the anon key». Es decir: consagraba como requisito el
  // comentario que decia que `DATABASE_URL` DEBE ser la URL que se salta RLS.
  //
  // Ese comentario es la razon por la que el agujero duro tanto: escrito asi,
  // cualquiera que intentara poner un rol acotado creeria estar rompiendo el
  // sistema. Y la prueba lo defendia — habria puesto en rojo la correccion.
  //
  // La mitad que SI era cierta —nunca la clave anonima— se conserva. Lo que se
  // deja de exigir es que el codigo documente su propio bypass.
  /**
   * Quita comentarios antes de mirar el codigo.
   *
   * Sin esto, una prueba que busca `set_config(..., false)` casa con la PROSA que
   * explica por que no se usa `false`. Es la tercera vez en este trabajo que un
   * guard se cree sus propios comentarios: paso con el inventario de botones
   * muertos, con la ruta retirada cuya lapida la mantenia viva, y aqui.
   *
   * Solo se borran las lineas que EMPIEZAN por `//` o `*`: cortar por cualquier
   * `//` se comeria el resto de una linea con una URL dentro.
   */
  const soloCodigo = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, " ")
       .split(String.fromCharCode(10))
       .filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*"))
       .join(String.fromCharCode(10));

  it("DbClient sigue prohibiendo la clave anonima", () => {
    const src = readFileSync(join(dbRoot, "DbClient.ts"), "utf8");
    expect(src).toContain("DATABASE_URL");
    expect(src).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("DbClient ya no declara el bypass de RLS como requisito", () => {
    const src = soloCodigo(readFileSync(join(dbRoot, "DbClient.ts"), "utf8"));
    expect(/must use.*service_role/i.test(src)).toBe(false);
    expect(/bypasses RLS/i.test(src)).toBe(false);
  });

  it("DbClient aplica el contexto de inquilino de la peticion", () => {
    // El mecanismo tiene que estar CABLEADO, no solo existir: `query` y
    // `withTransaction` deben pedirlo. Comprobar unicamente que el modulo de
    // contexto existe seria confundir tener la funcion con usarla.
    const src = readFileSync(join(dbRoot, "DbClient.ts"), "utf8");
    expect(src).toContain("inquilinoActual");
    expect(src).toContain("aplicarContexto");
  });

  it("el contexto que llega a PostgreSQL tiene ambito de TRANSACCION", () => {
    // Con `set_config(..., false)` duraria la sesion, y las sesiones son
    // conexiones de un pool que se reutilizan entre inquilinos.
    const src = soloCodigo(readFileSync(join(dbRoot, "contextoDeInquilino.ts"), "utf8"));
    expect(src).toContain("set_config('app.tenant_id', $1, true)");
    expect(/set_config\([^)]*, false\)/.test(src)).toBe(false);
  });

  it("migración 279_rls_audit habilita RLS y políticas own", () => {
    const sql = readFileSync(join(dbRoot, "migrations/279_rls_audit.sql"), "utf8");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("nelvyon_apply_rls_user_id");
    expect(sql).toContain("nelvyon_users");
    expect(sql).toContain("dunning_log");
    expect(sql).toContain("subscriptions");
  });

  it("migración 280 documenta service_role vs authenticated", () => {
    const sql = readFileSync(join(dbRoot, "migrations/280_rls_service_role.sql"), "utf8");
    expect(sql).toContain("service_role");
    expect(sql).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("reporte de auditoría existe", () => {
    const md = readFileSync(join(dbRoot, "rls-audit-report.md"), "utf8");
    expect(md).toContain("15 mayo 2026");
    expect(md).toContain("lezzkqpkxcoxqqcgohof");
  });

  it("cliente frontend usa anon key cuando está configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", undefined);
    expect(getSupabaseAnonKey()).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon");
    vi.unstubAllEnvs();
  });

  it("browser rechaza service_role expuesto", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "secret-service-role");
    expect(() => assertNoServiceRoleKeyExposedInBrowser()).toThrow(/service_role/);
    vi.unstubAllEnvs();
  });

  /**
   * LAS DOS PRUEBAS «EN VIVO» QUE HABIA AQUI ERAN CASCARONES VACIOS.
   *
   * Decian certificar «usuario A no lee filas de usuario B» y «authenticated no
   * inserta con user_id ajeno», y su cuerpo entero era:
   *
   *     expect(process.env.RUN_SUPABASE_RLS).toBe("1");
   *
   * Es decir, afirmaban que la variable que las habia activado valia "1".
   * Habrian pasado el dia que alguien montara Supabase, sin haber comprobado ni
   * una fila. Y mientras tanto figuraban como EXTERNAL_VERIFICATION_REQUIRED, lo
   * que hacia creer que habia cobertura esperando infraestructura. No la habia:
   * habia un hueco con nombre de pendiente.
   *
   * Ademas Supabase ya NO esta en produccion — medido: ni
   * NEXT_PUBLIC_SUPABASE_URL, ni la clave anonima, ni la de servicio estan
   * definidas en el servicio web. La base es PostgreSQL de Railway.
   *
   * LA PROPIEDAD SI ESTA CERTIFICADA, y contra la base que se usa de verdad:
   * `rlsEfectivaWebApp.pg.test.ts` (21 pruebas) y `rlsFamiliasSaas.pg.test.ts`
   * (14) lo miden con el rol `nelvyon_web_app`, que SI esta sujeto a las
   * politicas — no con superusuario, que las evitaria.
   *
   * Lo que queda aqui es lo unico que este fichero puede garantizar sin
   * infraestructura: que esa cobertura sigue existiendo. Si alguien borra esas
   * suites, esto se pone rojo y el hueco vuelve a verse.
   */
  it("la RLS entre inquilinos se certifica contra PostgreSQL real, no aqui", () => {
    const suites = [
      "rlsEfectivaWebApp.pg.test.ts",
      "rlsFamiliasSaas.pg.test.ts",
      "elCutoverDelRolDelLadoWeb.pg.test.ts",
    ];
    for (const s of suites) {
      const ruta = join(dbRoot, "__tests__", s);
      expect(
        () => readFileSync(ruta, "utf8"),
        `falta ${s}: la RLS entre inquilinos se queda sin quien la certifique`,
      ).not.toThrow();
    }
    // Y que de verdad usan el rol acotado, no el superusuario.
    const efectiva = readFileSync(join(dbRoot, "__tests__", "rlsEfectivaWebApp.pg.test.ts"), "utf8");
    expect(efectiva, "no usa el rol sujeto a las politicas").toContain("NELVYON_WEB_APP_CERT_DSN");
    expect(efectiva, "no comprueba que el rol no salte RLS").toContain("rolbypassrls");
  });
});
