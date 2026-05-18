CREATE TABLE IF NOT EXISTS roi_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_params JSONB NOT NULL,
  predicted_roi NUMERIC(8,2),
  predicted_revenue NUMERIC(12,2),
  predicted_conversions INTEGER,
  confidence_score NUMERIC(5,2),
  reasoning TEXT,
  model_version VARCHAR(50) DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roi_predictions_user ON roi_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_roi_predictions_created ON roi_predictions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS roi_prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL,
  actual_roi NUMERIC(8,2),
  actual_revenue NUMERIC(12,2),
  actual_conversions INTEGER,
  accuracy_score NUMERIC(5,2),
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roi_prediction_results_prediction ON roi_prediction_results(prediction_id);
