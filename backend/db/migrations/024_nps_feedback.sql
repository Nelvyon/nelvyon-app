-- MIG 291 — NPS + feedback loop (nelvyon_users.user_id is UUID)
CREATE TABLE IF NOT EXISTS nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users (user_id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  comment text,
  category text GENERATED ALWAYS AS (
    CASE
      WHEN score >= 9 THEN 'promoter'
      WHEN score >= 7 THEN 'passive'
      ELSE 'detractor'
    END
  ) STORED,
  survey_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, survey_version)
);

CREATE INDEX IF NOT EXISTS idx_nps_responses_user_version ON nps_responses (user_id, survey_version);

CREATE TABLE IF NOT EXISTS feedback_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES nelvyon_users (user_id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bug', 'feature', 'praise', 'other')),
  title text NOT NULL,
  body text NOT NULL,
  url_context text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'planned', 'done', 'wont_fix')),
  upvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_items_upvotes ON feedback_items (upvotes DESC, created_at DESC);

ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nps_responses_select_own ON nps_responses;
CREATE POLICY nps_responses_select_own ON nps_responses
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS nps_responses_insert_own ON nps_responses;
CREATE POLICY nps_responses_insert_own ON nps_responses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_items_select_public ON feedback_items;
CREATE POLICY feedback_items_select_public ON feedback_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS feedback_items_insert_own ON feedback_items;
CREATE POLICY feedback_items_insert_own ON feedback_items
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
