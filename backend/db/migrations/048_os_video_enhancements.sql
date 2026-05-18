CREATE TABLE IF NOT EXISTS video_enhancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(32) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_enhancements_user_id ON video_enhancements(user_id);
CREATE INDEX IF NOT EXISTS idx_video_enhancements_type ON video_enhancements(type);
CREATE INDEX IF NOT EXISTS idx_video_enhancements_created_at ON video_enhancements(created_at);
