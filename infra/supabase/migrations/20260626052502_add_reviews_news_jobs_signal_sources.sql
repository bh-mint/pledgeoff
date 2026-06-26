-- Extend signals_source_check constraint to include reviews, news, jobs
ALTER TABLE public.signals
  DROP CONSTRAINT signals_source_check,
  ADD CONSTRAINT signals_source_check
    CHECK (source = ANY (ARRAY['reddit','github','hn','producthunt','google','devto','brave','reviews','news','jobs']));
