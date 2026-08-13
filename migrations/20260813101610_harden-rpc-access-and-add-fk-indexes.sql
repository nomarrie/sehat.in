-- Restrict privileged transactions to the server-side InsForge admin client.
-- Clone each reviewed transaction with an explicit user id. This keeps the
-- transaction body atomic without relying on mutable SQL session settings.
DO $migration$
DECLARE
  v_definition TEXT;
BEGIN
  SELECT pg_catalog.pg_get_functiondef(
    'public.complete_onboarding(text,integer,numeric,numeric,numeric,numeric,text,text,boolean,time without time zone,boolean,text)'::REGPROCEDURE
  ) INTO v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'FUNCTION public\.complete_onboarding\(',
    'FUNCTION public.edge_complete_onboarding(p_user_id uuid,',
    'i'
  );
  v_definition := pg_catalog.replace(
    v_definition,
    'v_user_id UUID := auth.uid();',
    'v_user_id UUID := p_user_id;'
  );
  IF pg_catalog.strpos(v_definition, 'edge_complete_onboarding') = 0
    OR pg_catalog.strpos(v_definition, 'v_user_id UUID := p_user_id;') = 0
  THEN
    RAISE EXCEPTION 'Could not harden complete_onboarding';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.record_weight_entry(numeric,date)'::REGPROCEDURE
  ) INTO v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'FUNCTION public\.record_weight_entry\(',
    'FUNCTION public.edge_record_weight_entry(p_user_id uuid,',
    'i'
  );
  v_definition := pg_catalog.replace(
    v_definition,
    'v_user_id UUID := auth.uid();',
    'v_user_id UUID := p_user_id;'
  );
  IF pg_catalog.strpos(v_definition, 'edge_record_weight_entry') = 0
    OR pg_catalog.strpos(v_definition, 'v_user_id UUID := p_user_id;') = 0
  THEN
    RAISE EXCEPTION 'Could not harden record_weight_entry';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.complete_workout_session(uuid,uuid,integer,timestamp with time zone,timestamp with time zone,jsonb)'::REGPROCEDURE
  ) INTO v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'FUNCTION public\.complete_workout_session\(',
    'FUNCTION public.edge_complete_workout_session(p_user_id uuid,',
    'i'
  );
  v_definition := pg_catalog.replace(
    v_definition,
    'v_user_id UUID := auth.uid();',
    'v_user_id UUID := p_user_id;'
  );
  IF pg_catalog.strpos(v_definition, 'edge_complete_workout_session') = 0
    OR pg_catalog.strpos(v_definition, 'v_user_id UUID := p_user_id;') = 0
  THEN
    RAISE EXCEPTION 'Could not harden complete_workout_session';
  END IF;
  EXECUTE v_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.complete_onboarding(TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN, TIME, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated, project_admin;
REVOKE ALL ON FUNCTION public.record_weight_entry(NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated, project_admin;
REVOKE ALL ON FUNCTION public.complete_workout_session(UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon, authenticated, project_admin;

REVOKE ALL ON FUNCTION public.edge_complete_onboarding(UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN, TIME, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.edge_record_weight_entry(UUID, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.edge_complete_workout_session(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.edge_complete_onboarding(UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN, TIME, BOOLEAN, TEXT)
  TO project_admin;
GRANT EXECUTE ON FUNCTION public.edge_record_weight_entry(UUID, NUMERIC, DATE)
  TO project_admin;
GRANT EXECUTE ON FUNCTION public.edge_complete_workout_session(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB)
  TO project_admin;

CREATE INDEX IF NOT EXISTS exercise_sessions_package_idx
  ON public.exercise_sessions (package_id);
CREATE INDEX IF NOT EXISTS exercise_session_items_sub_exercise_idx
  ON public.exercise_session_items (sub_exercise_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_idx
  ON public.user_badges (badge_id);

ALTER POLICY badges_select_authenticated ON public.badges
  USING ((SELECT auth.uid()) IS NOT NULL);
