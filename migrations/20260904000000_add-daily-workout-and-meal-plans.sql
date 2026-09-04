-- Store each nutrition recommendation set against the user's local calendar date.
ALTER TABLE public.nutrition_recommendation_sets
  ADD COLUMN IF NOT EXISTS scheduled_for DATE;

UPDATE public.nutrition_recommendation_sets AS recommendation_set
SET scheduled_for = (
  recommendation_set.created_at AT TIME ZONE profile.time_zone
)::DATE
FROM public.profiles AS profile
WHERE profile.user_id = recommendation_set.user_id
  AND recommendation_set.scheduled_for IS NULL;

UPDATE public.nutrition_recommendation_sets
SET scheduled_for = (created_at AT TIME ZONE 'UTC')::DATE
WHERE scheduled_for IS NULL;

CREATE OR REPLACE FUNCTION public.set_nutrition_recommendation_scheduled_for()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_time_zone TEXT;
BEGIN
  IF NEW.scheduled_for IS NULL THEN
    SELECT time_zone INTO v_time_zone
    FROM public.profiles
    WHERE user_id = NEW.user_id;

    NEW.scheduled_for := (NOW() AT TIME ZONE COALESCE(v_time_zone, 'Asia/Makassar'))::DATE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_nutrition_recommendation_scheduled_for
  ON public.nutrition_recommendation_sets;
CREATE TRIGGER set_nutrition_recommendation_scheduled_for
BEFORE INSERT ON public.nutrition_recommendation_sets
FOR EACH ROW
EXECUTE FUNCTION public.set_nutrition_recommendation_scheduled_for();

ALTER TABLE public.nutrition_recommendation_sets
  ALTER COLUMN scheduled_for SET NOT NULL;

CREATE INDEX IF NOT EXISTS nutrition_sets_user_schedule_idx
  ON public.nutrition_recommendation_sets (
    user_id,
    scheduled_for DESC,
    created_at DESC
  );

REVOKE ALL ON FUNCTION public.set_nutrition_recommendation_scheduled_for()
  FROM PUBLIC, anon, authenticated;
