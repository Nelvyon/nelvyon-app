-- NELVYON OS / SaaS — real auth users (multi-tenant via tenant_id)
CREATE TABLE IF NOT EXISTS nelvyon_users (
  user_id       TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free', -- free | starter | pro | enterprise | admin
  tenant_id     TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON nelvyon_users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON nelvyon_users(tenant_id);
