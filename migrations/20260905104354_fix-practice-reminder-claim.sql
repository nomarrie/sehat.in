CREATE OR REPLACE FUNCTION public.edge_claim_due_practice_reminders(
  p_now TIMESTAMPTZ DEFAULT NOW(),
  p_limit INTEGER DEFAULT 25,
  p_test_email TEXT DEFAULT NULL
) RETURNS TABLE (
  delivery_id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  reminder_date DATE,
  reminder_kind TEXT,
  package_id UUID,
  package_name TEXT,
  estimated_minutes SMALLINT,
  attempt_count SMALLINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_now IS NULL THEN
    RAISE EXCEPTION 'p_now is required';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 50';
  END IF;

  RETURN QUERY
  WITH due_profiles AS (
    SELECT
      profile.user_id,
      profile.full_name,
      auth_user.email,
      (p_now AT TIME ZONE profile.time_zone)::DATE AS local_date
    FROM public.profiles AS profile
    JOIN auth.users AS auth_user ON auth_user.id = profile.user_id
    WHERE profile.reminder_enabled = TRUE
      AND auth_user.email IS NOT NULL
      AND btrim(auth_user.email) <> ''
      AND (p_now AT TIME ZONE profile.time_zone)::TIME >= profile.reminder_time
      AND (
        p_test_email IS NULL
        OR lower(auth_user.email) = lower(p_test_email)
      )
  ),
  candidates AS (
    SELECT
      due_profile.user_id,
      due_profile.full_name,
      due_profile.email,
      due_profile.local_date,
      package.id AS package_id,
      package.name AS package_name,
      package.estimated_minutes,
      CASE
        WHEN package.scheduled_for = due_profile.local_date THEN 'new_session'
        ELSE 'missed_practice'
      END AS reminder_kind
    FROM due_profiles AS due_profile
    JOIN LATERAL (
      SELECT
        exercise_package.id,
        exercise_package.name,
        exercise_package.estimated_minutes,
        exercise_package.scheduled_for
      FROM public.exercise_packages AS exercise_package
      WHERE exercise_package.user_id = due_profile.user_id
        AND exercise_package.status = 'active'
        AND exercise_package.generation_status = 'ready'
        AND exercise_package.scheduled_for <= due_profile.local_date
        AND NOT EXISTS (
          SELECT 1
          FROM public.exercise_sessions AS exercise_session
          WHERE exercise_session.user_id = due_profile.user_id
            AND exercise_session.package_id = exercise_package.id
            AND exercise_session.status = 'completed'
        )
      ORDER BY exercise_package.scheduled_for DESC, exercise_package.created_at DESC
      LIMIT 1
    ) AS package ON TRUE
    ORDER BY package.scheduled_for, due_profile.user_id
    LIMIT p_limit
  ),
  claimed AS (
    INSERT INTO public.practice_email_deliveries (
      user_id,
      package_id,
      reminder_date,
      reminder_kind,
      status,
      attempt_count,
      last_attempted_at
    )
    SELECT
      candidate.user_id,
      candidate.package_id,
      candidate.local_date,
      candidate.reminder_kind,
      'pending',
      1,
      p_now
    FROM candidates AS candidate
    ON CONFLICT ON CONSTRAINT practice_email_deliveries_user_date_key DO UPDATE SET
      package_id = EXCLUDED.package_id,
      reminder_kind = EXCLUDED.reminder_kind,
      status = 'pending',
      attempt_count = public.practice_email_deliveries.attempt_count + 1,
      provider_message_id = NULL,
      last_error = NULL,
      last_attempted_at = p_now,
      sent_at = NULL
    WHERE public.practice_email_deliveries.status <> 'sent'
      AND public.practice_email_deliveries.attempt_count < 3
      AND public.practice_email_deliveries.last_attempted_at <= p_now - INTERVAL '30 minutes'
    RETURNING
      public.practice_email_deliveries.id,
      public.practice_email_deliveries.user_id,
      public.practice_email_deliveries.reminder_date,
      public.practice_email_deliveries.reminder_kind,
      public.practice_email_deliveries.package_id,
      public.practice_email_deliveries.attempt_count
  )
  SELECT
    claimed.id,
    claimed.user_id,
    candidate.email,
    candidate.full_name,
    claimed.reminder_date,
    claimed.reminder_kind,
    claimed.package_id,
    candidate.package_name,
    candidate.estimated_minutes,
    claimed.attempt_count
  FROM claimed
  JOIN candidates AS candidate
    ON candidate.user_id = claimed.user_id
   AND candidate.package_id = claimed.package_id;
END;
$$;

REVOKE ALL ON FUNCTION public.edge_claim_due_practice_reminders(
  TIMESTAMPTZ, INTEGER, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_claim_due_practice_reminders(
  TIMESTAMPTZ, INTEGER, TEXT
) TO project_admin;
