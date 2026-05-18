CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user_created ON audit_log(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION audit_log_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE PROCEDURE audit_log_prevent_mutation();
