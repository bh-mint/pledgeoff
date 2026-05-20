-- Fix notify_welcome_email trigger: update URL from www.pledgeoff.com → pledgeoff.com
-- www now redirects (308); pg_net doesn't follow POST redirects → webhook was silently failing.
-- Applied: prod only (trigger doesn't exist on dev).

CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM
    net.http_post(
      url     := 'https://pledgeoff.com/api/v1/webhooks/new-user',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.webhook_secret_new_user', true)
      ),
      body    := jsonb_build_object(
        'type',   'INSERT',
        'table',  'profiles',
        'schema', 'public',
        'record', jsonb_build_object(
          'id',         NEW.id::text,
          'email',      NEW.email,
          'full_name',  NEW.full_name,
          'avatar_url', NEW.avatar_url,
          'created_at', NEW.created_at
        )
      )
    );
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$;
