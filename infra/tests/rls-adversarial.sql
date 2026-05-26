-- RLS Adversarial Test Suite
-- Run via psql as superuser after rls-ci-setup.sql + all migrations.
-- Each group runs in an explicit transaction so SET LOCAL is scoped correctly.
-- Fails fast with RAISE EXCEPTION on any violation.

\set ON_ERROR_STOP on

-- ─────────────────────────────────────────────────────────
-- Assertion helper (superuser context, runs outside groups)
-- ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION assert_count(label text, actual bigint, expected bigint) RETURNS void AS $$
BEGIN
  IF actual <> expected THEN
    RAISE EXCEPTION 'FAIL [%]: expected % rows but got %', label, expected, actual;
  ELSE
    RAISE NOTICE 'PASS [%]', label;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────
-- Seed: two users + alice's data (superuser bypasses RLS)
-- Inserted before any role changes so FK + CHECK pass.
-- ─────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at, updated_at, confirmation_sent_at, is_super_admin, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alice@test.com', now(), now(), now(), false, 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'bob@test.com',   now(), now(), now(), false, 'authenticated')
ON CONFLICT DO NOTHING;

-- Alice's idea (text CHECK requires >= 10 chars)
INSERT INTO ideas (id, user_id, text, created_at)
VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Alice idea.', now())
ON CONFLICT DO NOTHING;

INSERT INTO signals (id, idea_id, source, url, title, summary, sentiment, fetched_at)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'reddit', 'https://reddit.com/r/test/1', 'Test signal', 'Positive discussion', 'positive', now()
) ON CONFLICT DO NOTHING;

INSERT INTO decisions (id, idea_id, verdict, reasoning, confidence, signal_ids, score, created_at)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'GO', 'Looks promising.', 0.900,
  ARRAY['20000000-0000-0000-0000-000000000001']::UUID[], 73, now()
) ON CONFLICT DO NOTHING;

INSERT INTO feedback (id, idea_id, decision_id, user_id, vote, created_at)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'thumbs_up', now()
) ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- GROUP 1: Alice reads her own data
-- ─────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';

SELECT assert_count('alice reads own idea',
  (SELECT count(*) FROM ideas WHERE id = '10000000-0000-0000-0000-000000000001'), 1);

SELECT assert_count('alice reads signals for own idea',
  (SELECT count(*) FROM signals WHERE idea_id = '10000000-0000-0000-0000-000000000001'), 1);

SELECT assert_count('alice reads decision for own idea',
  (SELECT count(*) FROM decisions WHERE idea_id = '10000000-0000-0000-0000-000000000001'), 1);

SELECT assert_count('alice reads own feedback',
  (SELECT count(*) FROM feedback WHERE id = '40000000-0000-0000-0000-000000000001'), 1);

SELECT assert_count('alice reads own profile',
  (SELECT count(*) FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001'), 1);

COMMIT;

-- ─────────────────────────────────────────────────────────
-- GROUP 2: Bob cannot read Alice's data (RLS → 0 rows)
-- ─────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000002';

SELECT assert_count('bob cannot see alice idea',
  (SELECT count(*) FROM ideas WHERE id = '10000000-0000-0000-0000-000000000001'), 0);

SELECT assert_count('bob cannot see alice signals',
  (SELECT count(*) FROM signals WHERE idea_id = '10000000-0000-0000-0000-000000000001'), 0);

SELECT assert_count('bob cannot see alice decision',
  (SELECT count(*) FROM decisions WHERE idea_id = '10000000-0000-0000-0000-000000000001'), 0);

SELECT assert_count('bob cannot see alice feedback',
  (SELECT count(*) FROM feedback WHERE id = '40000000-0000-0000-0000-000000000001'), 0);

SELECT assert_count('bob cannot see alice profile',
  (SELECT count(*) FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001'), 0);

COMMIT;

-- ─────────────────────────────────────────────────────────
-- GROUP 3: Bob cannot INSERT on behalf of Alice
-- WITH CHECK violation: new row violates row-level security policy
-- DO blocks catch the error via savepoint so outer txn continues.
-- ─────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000002';

DO $$
BEGIN
  INSERT INTO ideas (id, user_id, text, created_at)
  VALUES ('10000000-0000-0000-0000-000000000099',
          '00000000-0000-0000-0000-000000000001',
          'Forged idea!!', now());
  RAISE EXCEPTION 'FAIL [bob cannot forge alice idea]: insert succeeded';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS [bob cannot forge alice idea]: blocked — %', SQLERRM;
END;
$$;

DO $$
BEGIN
  INSERT INTO feedback (id, idea_id, decision_id, user_id, vote, created_at)
  VALUES (
    '40000000-0000-0000-0000-000000000099',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'thumbs_up', now()
  );
  RAISE EXCEPTION 'FAIL [bob cannot forge alice feedback]: insert succeeded';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
  RAISE NOTICE 'PASS [bob cannot forge alice feedback]: blocked — %', SQLERRM;
END;
$$;

COMMIT;

-- ─────────────────────────────────────────────────────────
-- GROUP 4: authenticated has no GRANT on internal tables
-- (no GRANT → insufficient_privilege, not just 0 rows)
-- ─────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  PERFORM count(*) FROM outbox;
  RAISE EXCEPTION 'FAIL [authenticated cannot query outbox]: select succeeded';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [authenticated cannot query outbox]: permission denied';
  WHEN others THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS [authenticated cannot query outbox]: blocked — %', SQLERRM;
END;
$$;

DO $$
BEGIN
  PERFORM count(*) FROM audit_log;
  RAISE EXCEPTION 'FAIL [authenticated cannot query audit_log]: select succeeded';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS [authenticated cannot query audit_log]: permission denied';
  WHEN others THEN
    IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS [authenticated cannot query audit_log]: blocked — %', SQLERRM;
END;
$$;

COMMIT;

-- ─────────────────────────────────────────────────────────
-- GROUP 5: service_role bypasses RLS
-- ─────────────────────────────────────────────────────────

BEGIN;
SET LOCAL ROLE service_role;

SELECT assert_count('service_role reads all ideas',
  (SELECT count(*) FROM ideas), 1);

SELECT assert_count('service_role reads all signals',
  (SELECT count(*) FROM signals), 1);

SELECT assert_count('service_role reads all decisions',
  (SELECT count(*) FROM decisions), 1);

SELECT assert_count('service_role can query outbox (empty)',
  (SELECT count(*) FROM outbox), 0);

COMMIT;

DO $$ BEGIN RAISE NOTICE '✅ All RLS adversarial tests passed.'; END $$;
