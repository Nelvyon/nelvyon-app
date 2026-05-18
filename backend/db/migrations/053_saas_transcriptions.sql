CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  language VARCHAR(16),
  context VARCHAR(32) NOT NULL DEFAULT 'meeting',
  transcript_text TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  sentiment VARCHAR(16) NOT NULL DEFAULT 'neutral',
  duration_estimate VARCHAR(64) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_context ON transcriptions(context);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);
