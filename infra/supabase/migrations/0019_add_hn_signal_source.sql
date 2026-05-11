-- Add 'hn' (Hacker News) as a valid signal source.
-- HNSourceAdapter was added in session 56 but the DB constraint still only
-- allowed 'reddit' and 'github', causing upsertMany to fail silently and
-- breaking the entire pipeline for all new ideas.

ALTER TABLE signals
  DROP CONSTRAINT signals_source_check,
  ADD CONSTRAINT signals_source_check
    CHECK (source = ANY (ARRAY['reddit'::text, 'github'::text, 'hn'::text]));
