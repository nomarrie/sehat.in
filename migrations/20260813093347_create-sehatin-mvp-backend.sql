CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 100),
  age SMALLINT NOT NULL CHECK (age BETWEEN 13 AND 100),
  height_cm NUMERIC(5,1) NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
  initial_weight_kg NUMERIC(5,1) NOT NULL CHECK (initial_weight_kg BETWEEN 30 AND 300),
  current_weight_kg NUMERIC(5,1) NOT NULL CHECK (current_weight_kg BETWEEN 30 AND 300),
  target_weight_kg NUMERIC(5,1) NOT NULL CHECK (target_weight_kg BETWEEN 30 AND 300),
  weekly_target_kg NUMERIC(2,1) NOT NULL CHECK (weekly_target_kg BETWEEN 0.5 AND 1.0),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('pemula', 'menengah', 'aktif')),
  meal_preference TEXT NOT NULL CHECK (meal_preference IN ('seimbang', 'tinggi-protein', 'nabati')),
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TIME NOT NULL DEFAULT '18:30',
  weekly_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  time_zone TEXT NOT NULL DEFAULT 'Asia/Makassar',
  onboarding_completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (target_weight_kg < initial_weight_kg)
);

CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,1) NOT NULL CHECK (weight_kg BETWEEN 30 AND 300),
  logged_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, logged_on)
);

CREATE TABLE public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  start_weight_kg NUMERIC(5,1) NOT NULL CHECK (start_weight_kg BETWEEN 30 AND 300),
  target_weight_kg NUMERIC(5,1) NOT NULL CHECK (target_weight_kg BETWEEN 30 AND 300),
  planned_loss_kg NUMERIC(2,1) NOT NULL CHECK (planned_loss_kg BETWEEN 0.5 AND 1.0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'met', 'missed')),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start),
  CHECK (target_weight_kg <= start_weight_kg)
);

CREATE TABLE public.exercise_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  scheduled_for DATE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('pemula', 'menengah')),
  purpose TEXT NOT NULL CHECK (char_length(btrim(purpose)) BETWEEN 10 AND 500),
  estimated_minutes SMALLINT NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 120),
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  generation_status TEXT NOT NULL DEFAULT 'ready' CHECK (generation_status IN ('generating', 'ready', 'failed')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'replaced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sub_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.exercise_packages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 100),
  mode TEXT NOT NULL CHECK (mode IN ('timed', 'repetitions')),
  sets SMALLINT NOT NULL CHECK (sets BETWEEN 1 AND 10),
  repetitions SMALLINT CHECK (repetitions BETWEEN 1 AND 100),
  duration_seconds INTEGER CHECK (duration_seconds BETWEEN 10 AND 3600),
  rest_seconds INTEGER NOT NULL DEFAULT 0 CHECK (rest_seconds BETWEEN 0 AND 600),
  order_index SMALLINT NOT NULL CHECK (order_index BETWEEN 1 AND 50),
  instruction TEXT NOT NULL CHECK (char_length(btrim(instruction)) BETWEEN 5 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, order_index),
  CHECK (
    (mode = 'timed' AND duration_seconds IS NOT NULL AND repetitions IS NULL)
    OR (mode = 'repetitions' AND repetitions IS NOT NULL AND duration_seconds IS NULL)
  )
);

CREATE TABLE public.exercise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.exercise_packages(id) ON DELETE RESTRICT,
  client_completion_id UUID NOT NULL,
  active_duration_seconds INTEGER NOT NULL CHECK (active_duration_seconds BETWEEN 0 AND 86400),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL,
  activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_completion_id)
);

CREATE TABLE public.exercise_session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exercise_sessions(id) ON DELETE CASCADE,
  sub_exercise_id UUID NOT NULL REFERENCES public.sub_exercises(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_sets SMALLINT NOT NULL CHECK (completed_sets BETWEEN 0 AND 10),
  completed_repetitions INTEGER CHECK (completed_repetitions BETWEEN 0 AND 1000),
  active_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_duration_seconds BETWEEN 0 AND 14400),
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, sub_exercise_id)
);

CREATE TABLE public.nutrition_recommendation_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  based_on_weight_kg NUMERIC(5,1) NOT NULL CHECK (based_on_weight_kg BETWEEN 30 AND 300),
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  generation_status TEXT NOT NULL DEFAULT 'generating' CHECK (generation_status IN ('generating', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.nutrition_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_set_id UUID NOT NULL REFERENCES public.nutrition_recommendation_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Sarapan', 'Makan siang', 'Camilan', 'Makan malam')),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 500),
  rationale TEXT NOT NULL CHECK (char_length(btrim(rationale)) BETWEEN 10 AND 500),
  prep_minutes SMALLINT NOT NULL CHECK (prep_minutes BETWEEN 1 AND 240),
  servings SMALLINT NOT NULL CHECK (servings BETWEEN 1 AND 20),
  calories INTEGER NOT NULL CHECK (calories BETWEEN 50 AND 2000),
  protein_grams NUMERIC(5,1) NOT NULL CHECK (protein_grams BETWEEN 0 AND 300),
  carbs_grams NUMERIC(5,1) NOT NULL CHECK (carbs_grams BETWEEN 0 AND 500),
  fat_grams NUMERIC(5,1) NOT NULL CHECK (fat_grams BETWEEN 0 AND 200),
  fiber_grams NUMERIC(5,1) NOT NULL CHECK (fiber_grams BETWEEN 0 AND 100),
  order_index SMALLINT NOT NULL CHECK (order_index BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recommendation_set_id, order_index)
);

CREATE TABLE public.nutrition_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.nutrition_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount TEXT NOT NULL CHECK (char_length(btrim(amount)) BETWEEN 1 AND 80),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  order_index SMALLINT NOT NULL CHECK (order_index BETWEEN 1 AND 30),
  UNIQUE (recommendation_id, order_index)
);

CREATE TABLE public.nutrition_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.nutrition_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL CHECK (char_length(btrim(instruction)) BETWEEN 5 AND 1000),
  order_index SMALLINT NOT NULL CHECK (order_index BETWEEN 1 AND 30),
  UNIQUE (recommendation_id, order_index)
);

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('session_count', 'streak_days', 'weight_loss_kg', 'comeback')),
  criteria_value NUMERIC(6,1) NOT NULL CHECK (criteria_value > 0),
  consistency_focused BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE RESTRICT,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (longest_streak >= current_streak)
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('progress', 'badge', 'streak', 'system')),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 5 AND 500),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX weight_logs_user_date_idx ON public.weight_logs (user_id, logged_on DESC);
CREATE INDEX weekly_goals_user_week_idx ON public.weekly_goals (user_id, week_start DESC);
CREATE INDEX exercise_packages_user_schedule_idx ON public.exercise_packages (user_id, scheduled_for DESC);
CREATE INDEX sub_exercises_user_package_idx ON public.sub_exercises (user_id, package_id, order_index);
CREATE INDEX exercise_sessions_user_date_idx ON public.exercise_sessions (user_id, activity_date DESC);
CREATE INDEX exercise_session_items_user_session_idx ON public.exercise_session_items (user_id, session_id);
CREATE INDEX nutrition_sets_user_created_idx ON public.nutrition_recommendation_sets (user_id, created_at DESC);
CREATE INDEX nutrition_recommendations_user_set_idx ON public.nutrition_recommendations (user_id, recommendation_set_id, order_index);
CREATE INDEX nutrition_ingredients_user_recommendation_idx ON public.nutrition_ingredients (user_id, recommendation_id, order_index);
CREATE INDEX nutrition_steps_user_recommendation_idx ON public.nutrition_steps (user_id, recommendation_id, order_index);
CREATE INDEX user_badges_user_earned_idx ON public.user_badges (user_id, earned_at DESC);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER weight_logs_updated_at BEFORE UPDATE ON public.weight_logs
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER weekly_goals_updated_at BEFORE UPDATE ON public.weekly_goals
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER exercise_packages_updated_at BEFORE UPDATE ON public.exercise_packages
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER nutrition_sets_updated_at BEFORE UPDATE ON public.nutrition_recommendation_sets
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();
CREATE TRIGGER streaks_updated_at BEFORE UPDATE ON public.streaks
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

INSERT INTO public.badges (code, name, description, icon, criteria_type, criteria_value, consistency_focused) VALUES
  ('langkah-pertama', 'Langkah Pertama', 'Kamu menyelesaikan sesi latihan pertamamu.', 'footprints', 'session_count', 1, TRUE),
  ('streak-5-hari', 'Streak 5 Hari', 'Kamu menjaga waktu aktif selama lima hari berturut-turut.', 'fire', 'streak_days', 5, TRUE),
  ('consistent-army', 'Consistent Army', 'Dua minggu konsisten bergerak adalah fondasi yang kuat.', 'shield-check', 'streak_days', 14, TRUE),
  ('pejuang-diet-3kg', 'Pejuang Diet -3kg', 'Progres tiga kilogram tercapai dengan langkah yang bertahap.', 'trend-down', 'weight_loss_kg', 3, FALSE),
  ('comeback-kid', 'Comeback Kid', 'Kamu kembali bergerak setelah jeda dan memulai ritme baru.', 'arrow-counter-clockwise', 'comeback', 1, TRUE);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_recommendation_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY weight_logs_select_own ON public.weight_logs FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY weekly_goals_select_own ON public.weekly_goals FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY exercise_packages_select_own ON public.exercise_packages FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY sub_exercises_select_own ON public.sub_exercises FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY exercise_sessions_select_own ON public.exercise_sessions FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY exercise_session_items_select_own ON public.exercise_session_items FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY nutrition_sets_select_own ON public.nutrition_recommendation_sets FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY nutrition_recommendations_select_own ON public.nutrition_recommendations FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY nutrition_ingredients_select_own ON public.nutrition_ingredients FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY nutrition_steps_select_own ON public.nutrition_steps FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY badges_select_authenticated ON public.badges FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY user_badges_select_own ON public.user_badges FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY streaks_select_own ON public.streaks FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

GRANT USAGE ON SCHEMA public TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.profiles, public.weight_logs, public.weekly_goals,
  public.exercise_packages, public.sub_exercises, public.exercise_sessions,
  public.exercise_session_items, public.nutrition_recommendation_sets,
  public.nutrition_recommendations, public.nutrition_ingredients,
  public.nutrition_steps, public.badges, public.user_badges, public.streaks,
  public.notifications TO authenticated;
GRANT UPDATE (full_name, age, height_cm, target_weight_kg, weekly_target_kg,
  activity_level, meal_preference, reminder_enabled, reminder_time,
  weekly_summary_enabled) ON public.profiles TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_full_name TEXT,
  p_age INTEGER,
  p_height_cm NUMERIC,
  p_initial_weight_kg NUMERIC,
  p_target_weight_kg NUMERIC,
  p_weekly_target_kg NUMERIC,
  p_activity_level TEXT,
  p_meal_preference TEXT,
  p_reminder_enabled BOOLEAN DEFAULT TRUE,
  p_reminder_time TIME DEFAULT '18:30',
  p_weekly_summary_enabled BOOLEAN DEFAULT TRUE,
  p_time_zone TEXT DEFAULT 'Asia/Makassar'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE;
  v_week_start DATE;
  v_target NUMERIC(5,1);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  PERFORM NOW() AT TIME ZONE p_time_zone;
  v_today := (NOW() AT TIME ZONE p_time_zone)::DATE;
  v_week_start := date_trunc('week', v_today::TIMESTAMP)::DATE;
  v_target := GREATEST(p_target_weight_kg, p_initial_weight_kg - p_weekly_target_kg);

  INSERT INTO public.profiles (
    user_id, full_name, age, height_cm, initial_weight_kg, current_weight_kg,
    target_weight_kg, weekly_target_kg, activity_level, meal_preference,
    reminder_enabled, reminder_time, weekly_summary_enabled, time_zone
  ) VALUES (
    v_user_id, btrim(p_full_name), p_age, p_height_cm, p_initial_weight_kg,
    p_initial_weight_kg, p_target_weight_kg, p_weekly_target_kg,
    p_activity_level, p_meal_preference, p_reminder_enabled, p_reminder_time,
    p_weekly_summary_enabled, p_time_zone
  ) ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    age = EXCLUDED.age,
    height_cm = EXCLUDED.height_cm,
    target_weight_kg = EXCLUDED.target_weight_kg,
    weekly_target_kg = EXCLUDED.weekly_target_kg,
    activity_level = EXCLUDED.activity_level,
    meal_preference = EXCLUDED.meal_preference,
    reminder_enabled = EXCLUDED.reminder_enabled,
    reminder_time = EXCLUDED.reminder_time,
    weekly_summary_enabled = EXCLUDED.weekly_summary_enabled,
    time_zone = EXCLUDED.time_zone;

  INSERT INTO public.weight_logs (user_id, weight_kg, logged_on)
  VALUES (v_user_id, p_initial_weight_kg, v_today)
  ON CONFLICT (user_id, logged_on) DO UPDATE SET weight_kg = EXCLUDED.weight_kg;

  INSERT INTO public.weekly_goals (
    user_id, week_start, start_weight_kg, target_weight_kg, planned_loss_kg
  ) VALUES (v_user_id, v_week_start, p_initial_weight_kg, v_target, p_weekly_target_kg)
  ON CONFLICT (user_id, week_start) DO UPDATE SET
    start_weight_kg = EXCLUDED.start_weight_kg,
    target_weight_kg = EXCLUDED.target_weight_kg,
    planned_loss_kg = EXCLUDED.planned_loss_kg,
    status = 'active',
    evaluated_at = NULL;

  INSERT INTO public.streaks (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notifications (user_id, kind, title, message)
  VALUES (v_user_id, 'system', 'Programmu siap dimulai', 'Target minggu pertama sudah disusun. Mulai dengan satu langkah yang nyaman hari ini.');

  RETURN jsonb_build_object('userId', v_user_id, 'loggedOn', v_today, 'weekStart', v_week_start);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_weight_entry(
  p_weight_kg NUMERIC,
  p_logged_on DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_latest_weight NUMERIC(5,1);
  v_latest_date DATE;
  v_week_start DATE := date_trunc('week', p_logged_on::TIMESTAMP)::DATE;
  v_start_weight NUMERIC(5,1);
  v_goal_target NUMERIC(5,1);
  v_goal_status TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'onboarding required'; END IF;
  IF p_logged_on > (NOW() AT TIME ZONE v_profile.time_zone)::DATE THEN
    RAISE EXCEPTION 'logged_on cannot be in the future';
  END IF;

  INSERT INTO public.weight_logs (user_id, weight_kg, logged_on)
  VALUES (v_user_id, p_weight_kg, p_logged_on)
  ON CONFLICT (user_id, logged_on) DO UPDATE SET weight_kg = EXCLUDED.weight_kg;

  SELECT weight_kg, logged_on INTO v_latest_weight, v_latest_date
  FROM public.weight_logs WHERE user_id = v_user_id
  ORDER BY logged_on DESC, created_at DESC LIMIT 1;

  UPDATE public.profiles SET current_weight_kg = v_latest_weight WHERE user_id = v_user_id;

  SELECT COALESCE(
    (SELECT weight_kg FROM public.weight_logs
      WHERE user_id = v_user_id AND logged_on < v_week_start
      ORDER BY logged_on DESC LIMIT 1),
    v_profile.initial_weight_kg
  ) INTO v_start_weight;
  v_goal_target := GREATEST(v_profile.target_weight_kg, v_start_weight - v_profile.weekly_target_kg);
  v_goal_status := CASE WHEN v_latest_date >= v_week_start AND v_latest_weight <= v_goal_target THEN 'met' ELSE 'active' END;

  UPDATE public.weekly_goals SET status = 'missed', evaluated_at = NOW()
  WHERE user_id = v_user_id AND week_start < v_week_start AND status = 'active';

  INSERT INTO public.weekly_goals (
    user_id, week_start, start_weight_kg, target_weight_kg, planned_loss_kg, status,
    evaluated_at
  ) VALUES (
    v_user_id, v_week_start, v_start_weight, v_goal_target,
    v_profile.weekly_target_kg, v_goal_status,
    CASE WHEN v_goal_status = 'met' THEN NOW() ELSE NULL END
  ) ON CONFLICT (user_id, week_start) DO UPDATE SET
    target_weight_kg = EXCLUDED.target_weight_kg,
    planned_loss_kg = EXCLUDED.planned_loss_kg,
    status = EXCLUDED.status,
    evaluated_at = EXCLUDED.evaluated_at;

  INSERT INTO public.notifications (user_id, kind, title, message)
  VALUES (
    v_user_id,
    'progress',
    CASE WHEN v_goal_status = 'met' THEN 'Target minggu ini tercapai' ELSE 'Catatan berat diperbarui' END,
    CASE WHEN v_goal_status = 'met'
      THEN 'Progresmu tercatat. Paket berikutnya akan dinaikkan secara bertahap.'
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

CREATE OR REPLACE FUNCTION public.complete_workout_session(
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
  v_user_id UUID := auth.uid();
  v_session_id UUID;
  v_time_zone TEXT;
  v_activity_date DATE;
  v_daily_seconds INTEGER;
  v_previous_last DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_session_count INTEGER;
  v_weight_loss NUMERIC;
  v_is_comeback BOOLEAN := FALSE;
  v_new_badges JSONB := '[]'::JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF p_completed_at > NOW() + INTERVAL '5 minutes' THEN RAISE EXCEPTION 'completed_at cannot be in the future'; END IF;
  IF p_active_duration_seconds < 0 OR p_active_duration_seconds > 86400 THEN RAISE EXCEPTION 'invalid active duration'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exercise_packages
    WHERE id = p_package_id AND user_id = v_user_id AND generation_status = 'ready'
  ) THEN RAISE EXCEPTION 'package not found'; END IF;

  SELECT id INTO v_session_id FROM public.exercise_sessions
  WHERE user_id = v_user_id AND client_completion_id = p_client_completion_id;
  IF v_session_id IS NOT NULL THEN
    SELECT current_streak, longest_streak INTO v_current_streak, v_longest_streak
    FROM public.streaks WHERE user_id = v_user_id;
    RETURN jsonb_build_object('sessionId', v_session_id, 'currentStreak', COALESCE(v_current_streak, 0), 'longestStreak', COALESCE(v_longest_streak, 0), 'newBadges', '[]'::JSONB, 'duplicate', TRUE);
  END IF;

  SELECT time_zone INTO v_time_zone FROM public.profiles WHERE user_id = v_user_id;
  IF v_time_zone IS NULL THEN RAISE EXCEPTION 'onboarding required'; END IF;
  v_activity_date := (p_completed_at AT TIME ZONE v_time_zone)::DATE;

  INSERT INTO public.exercise_sessions (
    user_id, package_id, client_completion_id, active_duration_seconds,
    started_at, completed_at, activity_date
  ) VALUES (
    v_user_id, p_package_id, p_client_completion_id, p_active_duration_seconds,
    p_started_at, p_completed_at, v_activity_date
  ) RETURNING id INTO v_session_id;

  INSERT INTO public.exercise_session_items (
    session_id, sub_exercise_id, user_id, completed_sets,
    completed_repetitions, active_duration_seconds, completed
  )
  SELECT
    v_session_id, exercise.id, v_user_id,
    LEAST(GREATEST(COALESCE(result.completed_sets, 0), 0), 10),
    CASE WHEN result.completed_repetitions IS NULL THEN NULL ELSE LEAST(GREATEST(result.completed_repetitions, 0), 1000) END,
    LEAST(GREATEST(COALESCE(result.active_duration_seconds, 0), 0), 14400),
    COALESCE(result.completed, TRUE)
  FROM jsonb_to_recordset(CASE WHEN jsonb_typeof(p_results) = 'array' THEN p_results ELSE '[]'::JSONB END)
    AS result(sub_exercise_id UUID, completed_sets INTEGER, completed_repetitions INTEGER, active_duration_seconds INTEGER, completed BOOLEAN)
  JOIN public.sub_exercises exercise ON exercise.id = result.sub_exercise_id
  WHERE exercise.package_id = p_package_id AND exercise.user_id = v_user_id;

  UPDATE public.exercise_packages SET status = 'completed' WHERE id = p_package_id;
  SELECT COALESCE(SUM(active_duration_seconds), 0)::INTEGER INTO v_daily_seconds
  FROM public.exercise_sessions WHERE user_id = v_user_id AND activity_date = v_activity_date;

  INSERT INTO public.streaks (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT last_active_date, current_streak, longest_streak
  INTO v_previous_last, v_current_streak, v_longest_streak
  FROM public.streaks WHERE user_id = v_user_id FOR UPDATE;

  IF v_daily_seconds >= 1800 AND (v_previous_last IS NULL OR v_previous_last < v_activity_date) THEN
    v_is_comeback := v_previous_last IS NOT NULL AND v_previous_last <= v_activity_date - 7;
    v_current_streak := CASE WHEN v_previous_last = v_activity_date - 1 THEN v_current_streak + 1 ELSE 1 END;
    v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
    UPDATE public.streaks SET
      current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_active_date = v_activity_date
    WHERE user_id = v_user_id;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_session_count FROM public.exercise_sessions WHERE user_id = v_user_id;
  SELECT GREATEST(initial_weight_kg - current_weight_kg, 0) INTO v_weight_loss
  FROM public.profiles WHERE user_id = v_user_id;

  WITH awarded AS (
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT v_user_id, badge.id FROM public.badges badge
    WHERE
      (badge.criteria_type = 'session_count' AND v_session_count >= badge.criteria_value)
      OR (badge.criteria_type = 'streak_days' AND v_current_streak >= badge.criteria_value)
      OR (badge.criteria_type = 'weight_loss_kg' AND v_weight_loss >= badge.criteria_value)
      OR (badge.criteria_type = 'comeback' AND v_is_comeback)
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING badge_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', badge.id, 'name', badge.name, 'description', badge.description)), '[]'::JSONB)
  INTO v_new_badges FROM awarded JOIN public.badges badge ON badge.id = awarded.badge_id;

  IF jsonb_array_length(v_new_badges) > 0 THEN
    INSERT INTO public.notifications (user_id, kind, title, message)
    VALUES (v_user_id, 'badge', 'Badge baru diraih', 'Usahamu hari ini membuka pencapaian baru. Lihat detailnya di dashboard.');
  ELSIF v_daily_seconds >= 1800 THEN
    INSERT INTO public.notifications (user_id, kind, title, message)
    VALUES (v_user_id, 'streak', 'Target aktivitas harian tercapai', 'Kamu sudah mengumpulkan setidaknya 30 menit aktivitas hari ini.');
  ELSE
    INSERT INTO public.notifications (user_id, kind, title, message)
    VALUES (v_user_id, 'progress', 'Sesi latihan tersimpan', 'Waktu aktifmu sudah tercatat. Tambahkan aktivitas ringan bila tubuhmu masih nyaman.');
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

REVOKE ALL ON FUNCTION public.complete_onboarding(TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN, TIME, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_weight_entry(NUMERIC, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_workout_session(UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, BOOLEAN, TIME, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_weight_entry(NUMERIC, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_workout_session(UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO authenticated;
