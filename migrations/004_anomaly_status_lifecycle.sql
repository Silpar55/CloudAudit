-- Add lifecycle state to anomalies so users can dismiss/resolve them
-- and we can filter active vs handled anomalies in the UI.

ALTER TABLE cost_anomalies
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'resolved')),
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS status_note TEXT;

CREATE INDEX IF NOT EXISTS idx_cost_anomalies_account_status
  ON cost_anomalies (aws_account_id, status, detected_at DESC);
