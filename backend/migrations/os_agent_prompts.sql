-- Frente 58 — Encrypted OS agent prompts (never store plaintext in repo)

CREATE TABLE IF NOT EXISTS os_agent_prompts (
    agent_id TEXT PRIMARY KEY,
    prompt_encrypted TEXT NOT NULL,
    sector TEXT,
    agent_class TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS os_agent_prompts_sector_idx ON os_agent_prompts (sector);
