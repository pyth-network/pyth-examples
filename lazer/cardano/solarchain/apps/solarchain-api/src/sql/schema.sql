CREATE TABLE IF NOT EXISTS solarchain_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  batch JSONB NOT NULL,
  quote JSONB NOT NULL,
  climate JSONB NOT NULL,
  reference_price JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solarchain_snapshots_created_at
  ON solarchain_snapshots (created_at DESC);
