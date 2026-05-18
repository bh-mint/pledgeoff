-- Enable pgvector extension for cosine similarity search on signals
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to signals (voyage-3-lite = 512 dimensions)
ALTER TABLE signals ADD COLUMN IF NOT EXISTS embedding vector(512);

-- Index for fast cosine similarity search (IVFFlat — good for Tier 1 scale)
CREATE INDEX IF NOT EXISTS signals_embedding_idx
  ON signals
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- RPC function: top-N signals by cosine similarity for a given idea
-- Falls back gracefully: signals with NULL embedding ranked last
CREATE OR REPLACE FUNCTION match_signals(
  query_embedding vector(512),
  match_idea_id   UUID,
  match_count     INT DEFAULT 15
)
RETURNS SETOF signals
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT *
  FROM signals
  WHERE idea_id = match_idea_id
  ORDER BY
    CASE WHEN embedding IS NULL THEN 1 ELSE 0 END,
    CASE WHEN embedding IS NOT NULL THEN embedding <=> query_embedding END
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION match_signals TO service_role;
GRANT EXECUTE ON FUNCTION match_signals TO authenticated;
