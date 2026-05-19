-- MIG 294 — OAuth connections (server-side tokens, encrypted at app layer)
CREATE TABLE IF NOT EXISTS oauth_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users (user_id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google', 'meta', 'tiktok', 'linkedin')),
  scopes text[] NOT NULL DEFAULT '{}',
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  external_account_id text,
  external_account_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_user_id ON oauth_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider ON oauth_connections (provider);

ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oauth_connections_select_own ON oauth_connections;
CREATE POLICY oauth_connections_select_own ON oauth_connections
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS oauth_connections_delete_own ON oauth_connections;
CREATE POLICY oauth_connections_delete_own ON oauth_connections
  FOR DELETE
  USING (user_id = auth.uid());
