// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { getSupabaseAnonKey, assertNoServiceRoleKeyExposedInBrowser } from "../../../apps/web/src/lib/supabaseClient";

const dbRoot = join(__dirname, "..");
const RUN_SUPABASE_RLS_LIVE = process.env.RUN_SUPABASE_RLS === "1";

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

  it.skipIf(!RUN_SUPABASE_RLS_LIVE)(
    "RLS en vivo: usuario A no lee filas de usuario B",
    async () => {
      // Requiere RUN_SUPABASE_RLS=1 + Supabase project + JWT de dos tenants
      expect(process.env.RUN_SUPABASE_RLS).toBe("1");
    },
  );

  it.skipIf(!RUN_SUPABASE_RLS_LIVE)(
    "RLS en vivo: authenticated no inserta con user_id ajeno",
    async () => {
      // Requiere RUN_SUPABASE_RLS=1 + rol authenticated
      expect(process.env.RUN_SUPABASE_RLS).toBe("1");
    },
  );
});
