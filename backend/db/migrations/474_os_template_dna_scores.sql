-- O26 — Template DNA scores (GA4 CVR + pack QA + learning rank fusion per seed)
CREATE TABLE IF NOT EXISTS os_template_dna_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id       TEXT NOT NULL,
  seed_id         TEXT NOT NULL,
  source          TEXT CHECK (source IN ('envato','synthetic','metadata')),
  dna_score       NUMERIC(6,2) NOT NULL DEFAULT 0,
  cvr_component   NUMERIC(6,4),
  qa_component    NUMERIC(6,2),
  rank_component  INT,
  pack_runs       INT NOT NULL DEFAULT 0,
  avg_qa_score    NUMERIC(6,2),
  learning_rank   INT,
  learning_score  NUMERIC(6,4),
  metadata        JSONB NOT NULL DEFAULT '{}',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS os_template_dna_scores_sector_seed
  ON os_template_dna_scores (sector_id, seed_id);

CREATE INDEX IF NOT EXISTS os_template_dna_scores_sector_score
  ON os_template_dna_scores (sector_id, dna_score DESC);
