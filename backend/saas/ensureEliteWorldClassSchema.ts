import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";

let schemaReady = false;

/** Minimal DDL for migration 482 — avoids brittle split of full .sql file. */
const ELITE_WORLD_CLASS_DDL = `
CREATE TABLE IF NOT EXISTS saas_tenant_ip_allowlist (
  tenant_id UUID PRIMARY KEY REFERENCES saas_tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  cidrs TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_user_mfa (
  user_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  totp_secret_enc TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes_hash TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS mfa_enforced BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS saas_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE TABLE IF NOT EXISTS saas_member_custom_roles (
  user_id TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES saas_custom_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, tenant_id)
);
CREATE TABLE IF NOT EXISTS saas_sandbox_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  sandbox_tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sandbox_tenant_id)
);
CREATE TABLE IF NOT EXISTS saas_crm_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  regions TEXT[] NOT NULL DEFAULT '{}',
  owner_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_deliverability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  bounce_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  complaint_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  sent_30d INT NOT NULL DEFAULT 0,
  bounced_30d INT NOT NULL DEFAULT 0,
  complaints_30d INT NOT NULL DEFAULT 0,
  dedicated_ip TEXT,
  warmup_day INT NOT NULL DEFAULT 0,
  health_score INT NOT NULL DEFAULT 100,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliverability_tenant_captured
  ON saas_deliverability_snapshots (tenant_id, captured_at DESC);
CREATE TABLE IF NOT EXISTS saas_marketplace_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Nelvyon',
  category TEXT NOT NULL,
  install_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saas_tenant_installed_apps (
  tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES saas_marketplace_apps(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, app_id)
);
INSERT INTO saas_marketplace_apps (slug, name, description, author, category, install_count)
VALUES
  ('zapier', 'Zapier', 'Conecta 5000+ apps con triggers y acciones Nelvyon', 'Nelvyon', 'automation', 0),
  ('make', 'Make.com', 'Automatizaciones visuales con webhooks Nelvyon', 'Nelvyon', 'automation', 0),
  ('n8n', 'n8n', 'Self-hosted automation con API pública v2', 'Nelvyon', 'automation', 0),
  ('hubspot-sync', 'HubSpot Sync', 'Sincronización bidireccional contactos y deals', 'Nelvyon', 'crm', 0),
  ('google-analytics', 'Google Analytics 4', 'Eventos de conversión desde funnels', 'Nelvyon', 'analytics', 0)
ON CONFLICT (slug) DO NOTHING
`;

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}

async function tableExists(db: Pick<DbClient, "query">, table: string): Promise<boolean> {
  const rows = await db.query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS ok`,
    [table],
  );
  return Boolean(rows[0]?.ok);
}

/** Lazy DDL for migration 482 tables — avoids 500 when prod migrate lags behind deploy. */
export async function ensureEliteWorldClassSchema(db: Pick<DbClient, "query"> = DbClientClass.getInstance()): Promise<void> {
  if (schemaReady) return;

  for (const stmt of splitStatements(ELITE_WORLD_CLASS_DDL)) {
    try {
      await db.query(stmt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/already exists|duplicate/i.test(msg)) {
        /* concurrent deploy or partial DDL — continue */
      }
    }
  }

  const ok =
    (await tableExists(db, "saas_deliverability_snapshots")) &&
    (await tableExists(db, "saas_marketplace_apps")) &&
    (await tableExists(db, "saas_tenant_ip_allowlist"));

  if (ok) schemaReady = true;
}

export function resetEliteWorldClassSchemaForTests(): void {
  schemaReady = false;
}
