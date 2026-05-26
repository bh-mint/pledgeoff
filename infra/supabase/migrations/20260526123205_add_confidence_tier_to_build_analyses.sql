-- Migration: add confidence_tier to build_analyses
-- Tracks how well the LLM-generated stack is anchored in real signals

ALTER TABLE public.build_analyses
  ADD COLUMN IF NOT EXISTS confidence_tier VARCHAR(10)
    CHECK (confidence_tier IN ('HIGH', 'MEDIUM', 'LOW'));
