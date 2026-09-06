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

  SELECT COALESCE(SUM(session.active_duration_seconds), 0)::INTEGER
  INTO v_daily_seconds
  FROM public.exercise_sessions AS session
  JOIN public.exercise_packages AS workout_package
    ON workout_package.id = session.package_id
  WHERE session.user_id = p_user_id
    AND session.activity_date = v_activity_date
    AND (
      workout_package.generated_by_ai
      OR EXISTS (
        SELECT 1
        FROM public.exercise_sessions AS ai_session
        JOIN public.exercise_packages AS ai_package
          ON ai_package.id = ai_session.package_id
        WHERE ai_session.user_id = p_user_id
          AND ai_session.activity_date = v_activity_date
          AND ai_package.generated_by_ai
      )
    );

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

REVOKE ALL ON FUNCTION public.edge_complete_workout_session(
  UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_complete_workout_session(
  UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB
) TO project_admin;
