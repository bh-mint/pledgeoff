ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS niche TEXT NOT NULL DEFAULT 'other'
  CHECK (niche IN (
    'ai_ml', 'dev_tools', 'saas_b2b', 'fintech', 'ecommerce',
    'health', 'edtech', 'productivity', 'marketing', 'security',
    'gaming', 'social', 'data', 'nocode', 'other'
  ));

CREATE INDEX IF NOT EXISTS ideas_niche_idx ON public.ideas (niche);
