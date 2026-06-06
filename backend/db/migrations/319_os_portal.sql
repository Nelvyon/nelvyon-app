-- OS-1-09: portal cliente — invites + usuarios portal (FK → os_clients)

CREATE TABLE IF NOT EXISTS os_portal_invites (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       INTEGER NOT NULL,
  client_id          UUID NOT NULL REFERENCES os_clients (id) ON DELETE RESTRICT,
  email              TEXT NOT NULL,
  token_hash         TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'viewer'
                     CHECK (role IN ('viewer')),
  expires_at         TIMESTAMPTZ NOT NULL,
  accepted_at        TIMESTAMPTZ,
  created_by_user_id TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_os_portal_invites_token_hash
  ON os_portal_invites (token_hash);

CREATE INDEX IF NOT EXISTS idx_os_portal_invites_workspace_client
  ON os_portal_invites (workspace_id, client_id);

CREATE INDEX IF NOT EXISTS idx_os_portal_invites_email
  ON os_portal_invites (email);

CREATE TABLE IF NOT EXISTS os_portal_users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       INTEGER NOT NULL,
  client_id          UUID NOT NULL REFERENCES os_clients (id) ON DELETE RESTRICT,
  email              TEXT NOT NULL,
  password_hash      TEXT NOT NULL,
  name               TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'disabled')),
  invite_id          UUID REFERENCES os_portal_invites (id) ON DELETE SET NULL,
  last_login_at      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_os_portal_users_workspace_email
  ON os_portal_users (workspace_id, email);

CREATE INDEX IF NOT EXISTS idx_os_portal_users_client
  ON os_portal_users (client_id);

COMMENT ON TABLE os_portal_invites IS
  'Invitaciones portal cliente OS (OS-1-09). Token raw entregado una vez; solo token_hash en DB.';

COMMENT ON TABLE os_portal_users IS
  'Usuarios portal cliente OS. Aislamiento por workspace_id + client_id.';
