// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { getSupabaseAnonKey, assertNoServiceRoleKeyExposedInBrowser } from "../../../apps/web/src/lib/supabaseClient";

const dbRoot = join(__dirname, "..");

describe("RLS audit (MIG 279)", () => {
  it("DbClient documenta uso de DATABASE_URL / service_role", () => {
    const src = readFileSync(join(dbRoot, "DbClient.ts"), "utf8");
    expect(src).toContain("service_role");
    expect(src).toContain("DATABASE_URL");
    expect(src).toContain("NEVER use the anon key");
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

  it.skip("RLS en vivo: usuario A no lee filas de usuario B", async () => {
    // Requiere Supabase project lezzkqpkxcoxqqcgohof + JWT de dos tenants
  });

  it.skip("RLS en vivo: authenticated no inserta con user_id ajeno", async () => {
    // Requiere conexión Supabase con rol authenticated
  });
});
