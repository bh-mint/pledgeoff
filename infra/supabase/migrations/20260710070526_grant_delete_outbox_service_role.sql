-- cleanup cron deletes old processed outbox rows via PostgREST (service
-- client), but service_role was never granted DELETE on outbox
-- (relacl: service_role=arwDxtm — no 'd'). §9 rule: CREATE TABLE must be
-- followed by full GRANTs for service_role.
GRANT DELETE ON public.outbox TO service_role;
