ALTER TABLE public.profiles
  ADD COLUMN ai_processing_consent_at TIMESTAMPTZ,
  ADD COLUMN ai_processing_consent_version TEXT,
  ADD CONSTRAINT profiles_ai_processing_consent_pair_check CHECK (
    (ai_processing_consent_at IS NULL) = (ai_processing_consent_version IS NULL)
  ),
  ADD CONSTRAINT profiles_ai_processing_consent_version_check CHECK (
    ai_processing_consent_version IS NULL
    OR char_length(btrim(ai_processing_consent_version)) BETWEEN 1 AND 50
  );

CREATE TABLE public.program_generation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  reason TEXT NOT NULL CHECK (reason IN ('onboarding', 'weight-update', 'workout-complete')),
  status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'completed', 'failed')),
  package_id UUID REFERENCES public.exercise_packages(id) ON DELETE SET NULL,
  recommendation_set_id UUID REFERENCES public.nutrition_recommendation_sets(id) ON DELETE SET NULL,
  failure_code TEXT CHECK (failure_code IS NULL OR char_length(failure_code) BETWEEN 1 AND 50),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key),
  CHECK (
    (status = 'completed' AND package_id IS NOT NULL AND recommendation_set_id IS NOT NULL AND completed_at IS NOT NULL)
    OR status <> 'completed'
  )
);

CREATE INDEX program_generation_requests_user_claimed_idx
  ON public.program_generation_requests (user_id, claimed_at DESC);

CREATE TRIGGER program_generation_requests_updated_at
BEFORE UPDATE ON public.program_generation_requests
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.program_generation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.program_generation_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.edge_complete_onboarding(
  p_user_id UUID,
  p_full_name TEXT,
  p_age INTEGER,
  p_height_cm NUMERIC,
  p_initial_weight_kg NUMERIC,
  p_target_weight_kg NUMERIC,
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
  v_result JSONB;
BEGIN
  IF p_ai_processing_consent
    AND char_length(btrim(COALESCE(p_ai_processing_consent_version, ''))) = 0
  THEN
    RAISE EXCEPTION 'consent version is required';
  END IF;

  v_result := public.edge_complete_onboarding(
    p_user_id,
    p_full_name,
    p_age,
    p_height_cm,
    p_initial_weight_kg,
    p_target_weight_kg,
    p_weekly_target_kg,
    p_activity_level,
    p_meal_preference,
    p_reminder_enabled,
    p_reminder_time,
    p_weekly_summary_enabled,
    p_time_zone
  );

  UPDATE public.profiles
  SET
    ai_processing_consent_at = CASE WHEN p_ai_processing_consent THEN NOW() ELSE NULL END,
    ai_processing_consent_version = CASE
      WHEN p_ai_processing_consent THEN btrim(p_ai_processing_consent_version)
      ELSE NULL
    END
  WHERE user_id = p_user_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.edge_complete_onboarding(
  UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT,
  BOOLEAN, TIME, BOOLEAN, TEXT
) FROM PUBLIC, anon, authenticated, project_admin;

REVOKE ALL ON FUNCTION public.edge_complete_onboarding(
  UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT,
  BOOLEAN, TIME, BOOLEAN, TEXT, BOOLEAN, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.edge_complete_onboarding(
  UUID, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT,
  BOOLEAN, TIME, BOOLEAN, TEXT, BOOLEAN, TEXT
) TO project_admin;

CREATE OR REPLACE FUNCTION public.edge_claim_program_generation(
  p_user_id UUID,
  p_idempotency_key TEXT,
  p_reason TEXT,
  p_daily_limit INTEGER DEFAULT 3,
  p_cooldown_seconds INTEGER DEFAULT 600
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_existing public.program_generation_requests%ROWTYPE;
  v_request_id UUID;
  v_recent_count INTEGER;
  v_earliest_claim TIMESTAMPTZ;
  v_latest_claim TIMESTAMPTZ;
  v_retry_after INTEGER;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'invalid user';
  END IF;
  IF char_length(p_idempotency_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid idempotency key';
  END IF;
  IF p_reason NOT IN ('onboarding', 'weight-update', 'workout-complete') THEN
    RAISE EXCEPTION 'invalid generation reason';
  END IF;
  IF p_daily_limit NOT BETWEEN 1 AND 20 OR p_cooldown_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'invalid generation limits';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::TEXT, 731894)
  );

  SELECT * INTO v_existing
  FROM public.program_generation_requests
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND AND v_existing.status = 'completed' THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'duplicate', TRUE,
      'reason', 'duplicate',
      'requestId', v_existing.id,
      'packageId', v_existing.package_id,
      'recommendationSetId', v_existing.recommendation_set_id,
      'retryAfterSeconds', 0
    );
  END IF;

  IF FOUND
    AND v_existing.status = 'claimed'
    AND v_existing.claimed_at > NOW() - INTERVAL '2 minutes'
  THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'duplicate', TRUE,
      'reason', 'in-progress',
      'requestId', v_existing.id,
      'retryAfterSeconds', GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (v_existing.claimed_at + INTERVAL '2 minutes' - NOW())))::INTEGER
      )
    );
  END IF;

  SELECT COUNT(*)::INTEGER, MIN(claimed_at), MAX(claimed_at)
  INTO v_recent_count, v_earliest_claim, v_latest_claim
  FROM public.program_generation_requests
  WHERE user_id = p_user_id
    AND claimed_at > NOW() - INTERVAL '24 hours'
    AND status IN ('claimed', 'completed', 'failed');

  IF v_recent_count >= p_daily_limit THEN
    v_retry_after := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (v_earliest_claim + INTERVAL '24 hours' - NOW())))::INTEGER
    );
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'duplicate', FALSE,
      'reason', 'quota',
      'retryAfterSeconds', v_retry_after
    );
  END IF;

  IF v_latest_claim IS NOT NULL
    AND v_latest_claim + make_interval(secs => p_cooldown_seconds) > NOW()
  THEN
    v_retry_after := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (
        v_latest_claim + make_interval(secs => p_cooldown_seconds) - NOW()
      )))::INTEGER
    );
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'duplicate', FALSE,
      'reason', 'cooldown',
      'retryAfterSeconds', v_retry_after
    );
  END IF;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.program_generation_requests
    SET
      status = 'claimed',
      reason = p_reason,
      package_id = NULL,
      recommendation_set_id = NULL,
      failure_code = NULL,
      claimed_at = NOW(),
      completed_at = NULL
    WHERE id = v_existing.id
    RETURNING id INTO v_request_id;
  ELSE
    INSERT INTO public.program_generation_requests (user_id, idempotency_key, reason)
    VALUES (p_user_id, p_idempotency_key, p_reason)
    RETURNING id INTO v_request_id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'duplicate', FALSE,
    'reason', 'allowed',
    'requestId', v_request_id,
    'retryAfterSeconds', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.edge_finish_program_generation(
  p_user_id UUID,
  p_request_id UUID,
  p_outcome TEXT,
  p_package_id UUID DEFAULT NULL,
  p_recommendation_set_id UUID DEFAULT NULL,
  p_failure_code TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  IF p_outcome NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'invalid generation outcome';
  END IF;
  IF p_outcome = 'completed' AND (p_package_id IS NULL OR p_recommendation_set_id IS NULL) THEN
    RAISE EXCEPTION 'completed generation requires result ids';
  END IF;

  UPDATE public.program_generation_requests
  SET
    status = p_outcome,
    package_id = CASE WHEN p_outcome = 'completed' THEN p_package_id ELSE NULL END,
    recommendation_set_id = CASE
      WHEN p_outcome = 'completed' THEN p_recommendation_set_id
      ELSE NULL
    END,
    failure_code = CASE
      WHEN p_outcome = 'failed' THEN left(COALESCE(NULLIF(p_failure_code, ''), 'GENERATION_FAILED'), 50)
      ELSE NULL
    END,
    completed_at = NOW()
  WHERE id = p_request_id
    AND user_id = p_user_id
    AND status = 'claimed'
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'generation claim not found';
  END IF;

  RETURN jsonb_build_object('requestId', v_updated_id, 'status', p_outcome);
END;
$$;

REVOKE ALL ON FUNCTION public.edge_claim_program_generation(UUID, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.edge_finish_program_generation(UUID, UUID, TEXT, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_claim_program_generation(UUID, TEXT, TEXT, INTEGER, INTEGER)
  TO project_admin;
GRANT EXECUTE ON FUNCTION public.edge_finish_program_generation(UUID, UUID, TEXT, UUID, UUID, TEXT)
  TO project_admin;
