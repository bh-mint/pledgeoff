ALTER TABLE signals
  DROP CONSTRAINT signals_source_check,
  ADD CONSTRAINT signals_source_check
    CHECK (source = ANY (ARRAY['reddit','github','hn','producthunt','google','devto']));
