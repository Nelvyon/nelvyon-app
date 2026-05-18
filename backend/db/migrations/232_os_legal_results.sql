-- MIG 232: legal_results creada en 068; alinear NOT NULL en created_at e índices OS.
ALTER TABLE legal_results ALTER COLUMN created_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legal_results_user_id ON legal_results(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_results_agent_id ON legal_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_legal_results_created_at ON legal_results(created_at);
