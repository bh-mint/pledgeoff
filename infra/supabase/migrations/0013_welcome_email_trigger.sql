-- Trigger: notify_welcome_email
-- Fires after INSERT on public.profiles (which itself is populated by the
-- existing on_auth_user_created trigger on auth.users).
-- Calls the Next.js webhook via pg_net to send a welcome email via Resend.
-- Works for both Google OAuth and email/password signups.

create or replace function public.notify_welcome_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform
    net.http_post(
      url     := 'https://www.pledgeoff.com/api/v1/webhooks/new-user',
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
  return NEW;
exception when others then
  -- Never block signup if email delivery fails
  return NEW;
end;
$$;

drop trigger if exists on_profile_welcome_email on public.profiles;
create trigger on_profile_welcome_email
  after insert on public.profiles
  for each row execute procedure public.notify_welcome_email();
