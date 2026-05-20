CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  feature TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 8) NOT NULL DEFAULT 0,
  trace_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_log_created_at ON public.ai_usage_log (created_at DESC);
CREATE INDEX idx_ai_usage_log_user_id ON public.ai_usage_log (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ai_usage_log_feature ON public.ai_usage_log (feature);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.ai_usage_log TO service_role;

-- Aggregate by feature + model for a given period
CREATE OR REPLACE FUNCTION admin_ai_usage_by_feature(since TIMESTAMPTZ)
RETURNS TABLE (
  feature TEXT,
  model TEXT,
  call_count BIGINT,
  total_input BIGINT,
  total_output BIGINT,
  total_cost NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    feature,
    model,
    COUNT(*) AS call_count,
    SUM(input_tokens) AS total_input,
    SUM(output_tokens) AS total_output,
    SUM(cost_usd) AS total_cost
  FROM ai_usage_log
  WHERE created_at >= since
  GROUP BY feature, model
  ORDER BY total_cost DESC;
$$;

-- Daily cost rollup
CREATE OR REPLACE FUNCTION admin_ai_usage_daily(since TIMESTAMPTZ)
RETURNS TABLE (
  day TEXT,
  total_cost NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS day,
    SUM(cost_usd) AS total_cost
  FROM ai_usage_log
  WHERE created_at >= since
  GROUP BY DATE_TRUNC('day', created_at)
  ORDER BY DATE_TRUNC('day', created_at) ASC;
$$;

-- Top users by cost (joins auth.users for email)
CREATE OR REPLACE FUNCTION admin_ai_top_users(since TIMESTAMPTZ, limit_count INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  call_count BIGINT,
  total_cost NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    u.user_id,
    au.email,
    u.call_count,
    u.total_cost
  FROM (
    SELECT
      ai_usage_log.user_id,
      COUNT(*) AS call_count,
      SUM(cost_usd) AS total_cost
    FROM ai_usage_log
    WHERE created_at >= since AND ai_usage_log.user_id IS NOT NULL
    GROUP BY ai_usage_log.user_id
    ORDER BY total_cost DESC
    LIMIT limit_count
  ) u
  LEFT JOIN auth.users au ON au.id = u.user_id;
$$;

GRANT EXECUTE ON FUNCTION admin_ai_usage_by_feature(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION admin_ai_usage_daily(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION admin_ai_top_users(TIMESTAMPTZ, INT) TO service_role;

-- Total cost for a time range
CREATE OR REPLACE FUNCTION admin_ai_usage_total(since TIMESTAMPTZ)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(cost_usd), 0) FROM ai_usage_log WHERE created_at >= since;
$$;

-- All-time total
CREATE OR REPLACE FUNCTION admin_ai_usage_total_all()
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(cost_usd), 0) FROM ai_usage_log;
$$;

GRANT EXECUTE ON FUNCTION admin_ai_usage_total(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION admin_ai_usage_total_all() TO service_role;
