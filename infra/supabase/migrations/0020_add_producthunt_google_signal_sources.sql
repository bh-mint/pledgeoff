-- Add 'producthunt' and 'google' as valid signal sources.
-- ProductHuntSourceAdapter and GoogleSearchSourceAdapter replace Reddit (blocked on Vercel)
-- and HN (poor query relevance).

ALTER TABLE signals
  DROP CONSTRAINT signals_source_check,
  ADD CONSTRAINT signals_source_check
    CHECK (source = ANY (ARRAY['reddit'::text, 'github'::text, 'hn'::text, 'producthunt'::text, 'google'::text]));
