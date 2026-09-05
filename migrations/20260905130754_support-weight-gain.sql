ALTER TABLE public.profiles
  ADD COLUMN goal_direction TEXT NOT NULL DEFAULT 'lose';

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND (
        pg_catalog.pg_get_constraintdef(oid) LIKE '%target_weight_kg%initial_weight_kg%'
        OR pg_catalog.pg_get_constraintdef(oid) LIKE '%weekly_target_kg%'
      )
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.profiles DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN weekly_target_kg TYPE NUMERIC(3,2),
  ADD CONSTRAINT profiles_goal_direction_check
    CHECK (goal_direction IN ('lose', 'gain')),
  ADD CONSTRAINT profiles_goal_direction_target_check
    CHECK (
      (goal_direction = 'lose' AND target_weight_kg < initial_weight_kg)
      OR (goal_direction = 'gain' AND target_weight_kg > initial_weight_kg)
    ),
  ADD CONSTRAINT profiles_directional_weekly_target_check
    CHECK (
      (goal_direction = 'lose' AND weekly_target_kg BETWEEN 0.5 AND 1.0)
      OR (goal_direction = 'gain' AND weekly_target_kg BETWEEN 0.25 AND 0.5)
    );

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.weekly_goals'::regclass
      AND contype = 'c'
      AND (
        pg_catalog.pg_get_constraintdef(oid) LIKE '%target_weight_kg%start_weight_kg%'
        OR pg_catalog.pg_get_constraintdef(oid) LIKE '%planned_loss_kg%'
      )
  LOOP
    EXECUTE pg_catalog.format('ALTER TABLE public.weekly_goals DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.weekly_goals
  RENAME COLUMN planned_loss_kg TO planned_change_kg;

ALTER TABLE public.weekly_goals
  ADD COLUMN goal_direction TEXT NOT NULL DEFAULT 'lose',
  ALTER COLUMN planned_change_kg TYPE NUMERIC(3,2),
  ADD CONSTRAINT weekly_goals_goal_direction_check
    CHECK (goal_direction IN ('lose', 'gain')),
  ADD CONSTRAINT weekly_goals_directional_target_check
    CHECK (
      (goal_direction = 'lose' AND target_weight_kg <= start_weight_kg)
      OR (goal_direction = 'gain' AND target_weight_kg >= start_weight_kg)
    ),
  ADD CONSTRAINT weekly_goals_planned_change_check
    CHECK (
      (goal_direction = 'lose' AND planned_change_kg BETWEEN 0.5 AND 1.0)
      OR (goal_direction = 'gain' AND planned_change_kg BETWEEN 0.25 AND 0.5)
    );

ALTER TABLE public.badges
  DROP CONSTRAINT badges_criteria_type_check;

ALTER TABLE public.badges
  ADD CONSTRAINT badges_criteria_type_check
    CHECK (criteria_type IN ('session_count', 'streak_days', 'weight_loss_kg', 'weight_gain_kg', 'comeback'));

INSERT INTO public.badges (
  code, name, description, icon, criteria_type, criteria_value, consistency_focused
) VALUES (
  'bertumbuh-3kg',
  'Bertumbuh +3kg',
  'Progres kenaikan tiga kilogram tercapai dengan langkah yang bertahap.',
  'trend-up',
  'weight_gain_kg',
  3,
  FALSE
) ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.edge_complete_onboarding(
  p_user_id UUID,
  p_full_name TEXT,
  p_age INTEGER,
  p_height_cm NUMERIC,
  p_initial_weight_kg NUMERIC,
  p_target_weight_kg NUMERIC,
  p_goal_direction TEXT,
  p_weekly_target_kg NUMERIC,
  p_activity_level TEXT,
  p_meal_preference TEXT,
  p_reminder_enabled BOOLEAN,
  p_reminder_time TIME,
  p_weekly_summary_enabled BOOLEAN,
  p_time_zone TEXT,
  p_ai_processing_consent BOOLEAN,
  p_ai_processing_consent_version TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_today DATE;
  v_week_start DATE;
  v_target NUMERIC(5,1);
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'invalid user';
  END IF;
  IF p_goal_direction NOT IN ('lose', 'gain') THEN
    RAISE EXCEPTION 'invalid goal direction';
  END IF;
  IF (p_goal_direction = 'lose' AND p_target_weight_kg >= p_initial_weight_kg)
    OR (p_goal_direction = 'gain' AND p_target_weight_kg <= p_initial_weight_kg)
  THEN
    RAISE EXCEPTION 'target weight does not match goal direction';
  END IF;
  IF (p_goal_direction = 'lose' AND p_weekly_target_kg NOT BETWEEN 0.5 AND 1.0)
    OR (p_goal_direction = 'gain' AND p_weekly_target_kg NOT BETWEEN 0.25 AND 0.5)
  THEN
    RAISE EXCEPTION 'weekly target does not match goal direction';
  END IF;
  IF p_ai_processing_consent
    AND char_length(btrim(COALESCE(p_ai_processing_consent_version, ''))) = 0
  THEN
    RAISE EXCEPTION 'consent version is required';
  END IF;

  PERFORM NOW() AT TIME ZONE p_time_zone;
  v_today := (NOW() AT TIME ZONE p_time_zone)::DATE;
  v_week_start := date_trunc('week', v_today::TIMESTAMP)::DATE;
  v_target := CASE
    WHEN p_goal_direction = 'gain'
      THEN LEAST(p_target_weight_kg, p_initial_weight_kg + p_weekly_target_kg)
    ELSE GREATEST(p_target_weight_kg, p_initial_weight_kg - p_weekly_target_kg)
  END;

  INSERT INTO public.profiles (
    user_id, full_name, age, height_cm, initial_weight_kg, current_weight_kg,
    target_weight_kg, goal_direction, weekly_target_kg, activity_level, meal_preference,
    reminder_enabled, reminder_time, weekly_summary_enabled, time_zone,
    ai_processing_consent_at, ai_processing_consent_version
  ) VALUES (
    p_user_id, btrim(p_full_name), p_age, p_height_cm, p_initial_weight_kg,
    p_initial_weight_kg, p_target_weight_kg, p_goal_direction, p_weekly_target_kg,
    p_activity_level, p_meal_preference, p_reminder_enabled, p_reminder_time,
    p_weekly_summary_enabled, p_time_zone,
    CASE WHEN p_ai_processing_consent THEN NOW() ELSE NULL END,
    CASE WHEN p_ai_processing_consent THEN btrim(p_ai_processing_consent_version) ELSE NULL END
  ) ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    age = EXCLUDED.age,
    height_cm = EXCLUDED.height_cm,
    target_weight_kg = EXCLUDED.target_weight_kg,
    goal_direction = EXCLUDED.goal_direction,
    weekly_target_kg = EXCLUDED.weekly_target_kg,
    activity_level = EXCLUDED.activity_level,
    meal_preference = EXCLUDED.meal_preference,
    reminder_enabled = EXCLUDED.reminder_enabled,
    reminder_time = EXCLUDED.reminder_time,
    weekly_summary_enabled = EXCLUDED.weekly_summary_enabled,
    time_zone = EXCLUDED.time_zone,
    ai_processing_consent_at = EXCLUDED.ai_processing_consent_at,
    ai_processing_consent_version = EXCLUDED.ai_processing_consent_version;

  INSERT INTO public.weight_logs (user_id, weight_kg, logged_on)
  VALUES (p_user_id, p_initial_weight_kg, v_today)
  ON CONFLICT (user_id, logged_on) DO UPDATE SET weight_kg = EXCLUDED.weight_kg;

  INSERT INTO public.weekly_goals (
    user_id, week_start, start_weight_kg, target_weight_kg,
    planned_change_kg, goal_direction
  ) VALUES (
    p_user_id, v_week_start, p_initial_weight_kg, v_target,
    p_weekly_target_kg, p_goal_direction
  ) ON CONFLICT (user_id, week_start) DO UPDATE SET
    start_weight_kg = EXCLUDED.start_weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    planned_change_kg = EXCLUDED.planned_change_kg,
    goal_direction = EXCLUDED.goal_direction,
    status = 'active',
    evaluated_at = NULL;

  INSERT INTO public.streaks (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, kind, title, message)
  VALUES (p_user_id, 'system', 'Programmu siap dimulai', 'Target minggu pertama sudah disusun. Mulai dengan satu langkah yang nyaman hari ini.');

  RETURN jsonb_build_object('userId', p_user_id, 'loggedOn', v_today, 'weekStart', v_week_start);
END;
$$;

CREATE OR REPLACE FUNCTION public.edge_record_weight_entry(
  p_user_id UUID,
  p_weight_kg NUMERIC,
  p_logged_on DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_latest_weight NUMERIC(5,1);
  v_latest_date DATE;
  v_week_start DATE := date_trunc('week', p_logged_on::TIMESTAMP)::DATE;
  v_start_weight NUMERIC(5,1);
  v_goal_target NUMERIC(5,1);
  v_goal_status TEXT;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'onboarding required'; END IF;
  IF p_logged_on > (NOW() AT TIME ZONE v_profile.time_zone)::DATE THEN
    RAISE EXCEPTION 'logged_on cannot be in the future';
  END IF;

  INSERT INTO public.weight_logs (user_id, weight_kg, logged_on)
  VALUES (p_user_id, p_weight_kg, p_logged_on)
  ON CONFLICT (user_id, logged_on) DO UPDATE SET weight_kg = EXCLUDED.weight_kg;

  SELECT weight_kg, logged_on INTO v_latest_weight, v_latest_date
  FROM public.weight_logs WHERE user_id = p_user_id
  ORDER BY logged_on DESC, created_at DESC LIMIT 1;

  UPDATE public.profiles SET current_weight_kg = v_latest_weight WHERE user_id = p_user_id;

  SELECT COALESCE(
    (SELECT weight_kg FROM public.weight_logs
      WHERE user_id = p_user_id AND logged_on < v_week_start
      ORDER BY logged_on DESC LIMIT 1),
    v_profile.initial_weight_kg
  ) INTO v_start_weight;

  v_goal_target := CASE
    WHEN v_profile.goal_direction = 'gain'
      THEN LEAST(v_profile.target_weight_kg, v_start_weight + v_profile.weekly_target_kg)
    ELSE GREATEST(v_profile.target_weight_kg, v_start_weight - v_profile.weekly_target_kg)
  END;
  v_goal_status := CASE
    WHEN v_latest_date < v_week_start THEN 'active'
    WHEN v_profile.goal_direction = 'gain' AND v_latest_weight >= v_goal_target THEN 'met'
    WHEN v_profile.goal_direction = 'lose' AND v_latest_weight <= v_goal_target THEN 'met'
    ELSE 'active'
  END;

  UPDATE public.weekly_goals SET status = 'missed', evaluated_at = NOW()
  WHERE user_id = p_user_id AND week_start < v_week_start AND status = 'active';

  INSERT INTO public.weekly_goals (
    user_id, week_start, start_weight_kg, target_weight_kg, planned_change_kg,
    goal_direction, status, evaluated_at
  ) VALUES (
    p_user_id, v_week_start, v_start_weight, v_goal_target,
    v_profile.weekly_target_kg, v_profile.goal_direction, v_goal_status,
    CASE WHEN v_goal_status = 'met' THEN NOW() ELSE NULL END
  ) ON CONFLICT (user_id, week_start) DO UPDATE SET
    target_weight_kg = EXCLUDED.target_weight_kg,
    planned_change_kg = EXCLUDED.planned_change_kg,
    goal_direction = EXCLUDED.goal_direction,
    status = EXCLUDED.status,
    evaluated_at = EXCLUDED.evaluated_at;

  INSERT INTO public.notifications (user_id, kind, title, message)
  VALUES (
    p_user_id,
    'progress',
    CASE WHEN v_goal_status = 'met' THEN 'Target minggu ini tercapai' ELSE 'Catatan berat diperbarui' END,
    CASE WHEN v_goal_status = 'met'
      THEN 'Progresmu tercatat. Paket berikutnya akan disesuaikan secara bertahap.'
      ELSE 'Terima kasih sudah mencatat. Rencana berikutnya akan disesuaikan agar tetap realistis.' END
  );

  RETURN jsonb_build_object(
    'weight', v_latest_weight,
    'loggedOn', v_latest_date,
    'weeklyStatus', v_goal_status,
    'shouldRecalibrate', v_latest_date = p_logged_on
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.edge_complete_workout_session(
  p_user_id UUID,
  p_package_id UUID,
  p_client_completion_id UUID,
  p_active_duration_seconds INTEGER,
  p_started_at TIMESTAMPTZ,
  p_completed_at TIMESTAMPTZ,
  p_results JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_session_id UUID;
  v_time_zone TEXT;
  v_activity_date DATE;
  v_daily_seconds INTEGER;
  v_previous_last DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_session_count INTEGER;
  v_goal_direction TEXT;
  v_weight_progress NUMERIC;
  v_is_comeback BOOLEAN := FALSE;
  v_new_badges JSONB := '[]'::JSONB;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF p_completed_at > NOW() + INTERVAL '5 minutes' THEN RAISE EXCEPTION 'completed_at cannot be in the future'; END IF;
  IF p_active_duration_seconds < 0 OR p_active_duration_seconds > 86400 THEN RAISE EXCEPTION 'invalid active duration'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exercise_packages
    WHERE id = p_package_id AND user_id = p_user_id AND generation_status = 'ready'
  ) THEN RAISE EXCEPTION 'package not found'; END IF;

  SELECT id INTO v_session_id FROM public.exercise_sessions
  WHERE user_id = p_user_id AND client_completion_id = p_client_completion_id;
  IF v_session_id IS NOT NULL THEN
    SELECT current_streak, longest_streak INTO v_current_streak, v_longest_streak
    FROM public.streaks WHERE user_id = p_user_id;
    RETURN jsonb_build_object('sessionId', v_session_id, 'currentStreak', COALESCE(v_current_streak, 0), 'longestStreak', COALESCE(v_longest_streak, 0), 'newBadges', '[]'::JSONB, 'duplicate', TRUE);
  END IF;

  SELECT time_zone INTO v_time_zone FROM public.profiles WHERE user_id = p_user_id;
  IF v_time_zone IS NULL THEN RAISE EXCEPTION 'onboarding required'; END IF;
  v_activity_date := (p_completed_at AT TIME ZONE v_time_zone)::DATE;

  INSERT INTO public.exercise_sessions (
    user_id, package_id, client_completion_id, active_duration_seconds,
    started_at, completed_at, activity_date
  ) VALUES (
    p_user_id, p_package_id, p_client_completion_id, p_active_duration_seconds,
    p_started_at, p_completed_at, v_activity_date
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.exercise_session_items (
    session_id, sub_exercise_id, user_id, completed_sets,
    completed_repetitions, active_duration_seconds, completed
  )
  SELECT
    v_session_id, exercise.id, p_user_id,
    LEAST(GREATEST(COALESCE(result.completed_sets, 0), 0), 10),
    CASE WHEN result.completed_repetitions IS NULL THEN NULL ELSE LEAST(GREATEST(result.completed_repetitions, 0), 1000) END,
    LEAST(GREATEST(COALESCE(result.active_duration_seconds, 0), 0), 14400),
    COALESCE(result.completed, TRUE)
  FROM jsonb_to_recordset(CASE WHEN jsonb_typeof(p_results) = 'array' THEN p_results ELSE '[]'::JSONB END)
    AS result(sub_exercise_id UUID, completed_sets INTEGER, completed_repetitions INTEGER, active_duration_seconds INTEGER, completed BOOLEAN)
  JOIN public.sub_exercises exercise ON exercise.id = result.sub_exercise_id
  WHERE exercise.package_id = p_package_id AND exercise.user_id = p_user_id;

  UPDATE public.exercise_packages SET status = 'completed' WHERE id = p_package_id;
  SELECT COALESCE(SUM(active_duration_seconds), 0)::INTEGER INTO v_daily_seconds
  FROM public.exercise_sessions WHERE user_id = p_user_id AND activity_date = v_activity_date;

  INSERT INTO public.streaks (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT last_active_date, current_streak, longest_streak
  INTO v_previous_last, v_current_streak, v_longest_streak
  FROM public.streaks WHERE user_id = p_user_id FOR UPDATE;

  IF v_daily_seconds >= 1800 AND (v_previous_last IS NULL OR v_previous_last < v_activity_date) THEN
    v_is_comeback := v_previous_last IS NOT NULL AND v_previous_last <= v_activity_date - 7;
    v_current_streak := CASE WHEN v_previous_last = v_activity_date - 1 THEN v_current_streak + 1 ELSE 1 END;
    v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
    UPDATE public.streaks SET
      current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_active_date = v_activity_date
    WHERE user_id = p_user_id;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_session_count
  FROM public.exercise_sessions WHERE user_id = p_user_id;
  SELECT
    goal_direction,
    CASE
      WHEN goal_direction = 'gain' THEN GREATEST(current_weight_kg - initial_weight_kg, 0)
      ELSE GREATEST(initial_weight_kg - current_weight_kg, 0)
    END
  INTO v_goal_direction, v_weight_progress
  FROM public.profiles WHERE user_id = p_user_id;

  WITH awarded AS (
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT p_user_id, badge.id FROM public.badges badge
    WHERE
      (badge.criteria_type = 'session_count' AND v_session_count >= badge.criteria_value)
      OR (badge.criteria_type = 'streak_days' AND v_current_streak >= badge.criteria_value)
      OR (badge.criteria_type = 'weight_loss_kg' AND v_goal_direction = 'lose' AND v_weight_progress >= badge.criteria_value)
      OR (badge.criteria_type = 'weight_gain_kg' AND v_goal_direction = 'gain' AND v_weight_progress >= badge.criteria_value)
      OR (badge.criteria_type = 'comeback' AND v_is_comeback)
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING badge_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', badge.id, 'name', badge.name, 'description', badge.description)), '[]'::JSONB)
  INTO v_new_badges FROM awarded JOIN public.badges badge ON badge.id = awarded.badge_id;

  IF jsonb_array_length(v_new_badges) > 0 THEN
    INSERT INTO public.notifications (user_id, kind, title, message)
    VALUES (p_user_id, 'badge', 'Badge baru diraih', 'Usahamu hari ini membuka pencapaian baru. Lihat detailnya di dashboard.');
  ELSIF v_daily_seconds >= 1800 THEN
    INSERT INTO public.notifications (user_id, kind, title, message)
    VALUES (p_user_id, 'streak', 'Target aktivitas harian tercapai', 'Kamu sudah mengumpulkan setidaknya 30 menit aktivitas hari ini.');
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, message)
    VALUES (p_user_id, 'progress', 'Sesi latihan tersimpan', 'Waktu aktifmu sudah tercatat. Tambahkan aktivitas ringan bila tubuhmu masih nyaman.');
  END IF;

  RETURN jsonb_build_object(
    'sessionId', v_session_id,
    'activeMinutesToday', FLOOR(v_daily_seconds / 60.0),
    'currentStreak', v_current_streak,
    'longestStreak', v_longest_streak,
    'newBadges', v_new_badges,
    'duplicate', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edge_complete_onboarding(
  UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT,
  BOOLEAN, TIME, BOOLEAN, TEXT, BOOLEAN, TEXT
) FROM PUBLIC, anon, authenticated, project_admin;

REVOKE ALL ON FUNCTION public.edge_complete_onboarding(
  UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT,
  BOOLEAN, TIME, BOOLEAN, TEXT, BOOLEAN, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.edge_complete_onboarding(
  UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC, TEXT, TEXT,
  BOOLEAN, TIME, BOOLEAN, TEXT, BOOLEAN, TEXT
) TO project_admin;

REVOKE ALL ON FUNCTION public.edge_record_weight_entry(UUID, NUMERIC, DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_record_weight_entry(UUID, NUMERIC, DATE)
  TO project_admin;

REVOKE ALL ON FUNCTION public.edge_complete_workout_session(
  UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_complete_workout_session(
  UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) TO project_admin;
