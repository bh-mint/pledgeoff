-- DB-1: decisions.score column was never added in any migration.
-- Backfill from dimensions JSONB (weighted sum), then add NOT NULL.
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS score INTEGER;

UPDATE decisions
SET score = (
  SELECT ROUND(
    SUM((dim->>'weight')::numeric * (dim->>'score')::numeric)
  )
  FROM jsonb_array_elements(dimensions) AS dim
)
WHERE dimensions IS NOT NULL
  AND jsonb_array_length(dimensions) > 0
  AND score IS NULL;

-- Rows without dimensions get score derived from confidence (0-1 -> 0-100)
UPDATE decisions
SET score = ROUND(confidence * 100)
WHERE score IS NULL;

ALTER TABLE decisions ALTER COLUMN score SET NOT NULL;

-- ROLLBACK:
-- ALTER TABLE decisions DROP COLUMN IF EXISTS score;
