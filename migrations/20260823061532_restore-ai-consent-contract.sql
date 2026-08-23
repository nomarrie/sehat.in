ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_processing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processing_consent_version TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_ai_processing_consent_pair_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_ai_processing_consent_pair_check CHECK (
        (ai_processing_consent_at IS NULL) = (ai_processing_consent_version IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_ai_processing_consent_version_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_ai_processing_consent_version_check CHECK (
        ai_processing_consent_version IS NULL
        OR char_length(btrim(ai_processing_consent_version)) BETWEEN 1 AND 50
      );
  END IF;
END;
$$;

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
