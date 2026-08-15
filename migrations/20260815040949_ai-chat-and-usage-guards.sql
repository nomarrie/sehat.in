CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_message_id UUID,
  reply_to_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 4000),
  kind TEXT NOT NULL DEFAULT 'message' CHECK (kind IN ('message', 'adjustment')),
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  model TEXT,
  prompt_tokens INTEGER CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  completion_tokens INTEGER CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  adjustment_payload JSONB,
  adjustment_status TEXT NOT NULL DEFAULT 'none'
    CHECK (adjustment_status IN ('none', 'pending', 'applied', 'declined')),
  applied_package_id UUID REFERENCES public.exercise_packages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, client_message_id),
  CHECK (
    (kind = 'message' AND adjustment_payload IS NULL AND adjustment_status = 'none')
    OR (
      kind = 'adjustment'
      AND role = 'assistant'
      AND jsonb_typeof(adjustment_payload) = 'object'
      AND adjustment_status IN ('pending', 'applied', 'declined')
    )
  )
);

CREATE TABLE public.ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_request_id UUID NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('chat', 'program')),
  status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'succeeded', 'failed')),
  model TEXT,
  used_ai BOOLEAN NOT NULL DEFAULT FALSE,
  failure_code TEXT CHECK (failure_code IS NULL OR char_length(failure_code) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE (user_id, feature, client_request_id)
);

CREATE INDEX chat_sessions_user_updated_idx
  ON public.chat_sessions (user_id, updated_at DESC);
CREATE INDEX chat_messages_user_session_created_idx
  ON public.chat_messages (user_id, session_id, created_at);
CREATE INDEX chat_messages_reply_idx
  ON public.chat_messages (reply_to_message_id);
CREATE INDEX chat_messages_applied_package_idx
  ON public.chat_messages (applied_package_id);
CREATE INDEX ai_requests_user_feature_created_idx
  ON public.ai_requests (user_id, feature, created_at DESC);

CREATE TRIGGER chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_sessions_select_own
ON public.chat_sessions FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY chat_messages_select_own
ON public.chat_messages FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.chat_sessions, public.chat_messages, public.ai_requests
  FROM anon, authenticated;
GRANT SELECT ON public.chat_sessions, public.chat_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.edge_claim_ai_request(
  p_user_id UUID,
  p_feature TEXT,
  p_client_request_id UUID,
  p_daily_limit INTEGER,
  p_cooldown_seconds INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_existing public.ai_requests%ROWTYPE;
  v_request_id UUID;
  v_recent_count INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_client_request_id IS NULL THEN
    RAISE EXCEPTION 'invalid AI request identity';
  END IF;
  IF p_feature NOT IN ('chat', 'program') THEN
    RAISE EXCEPTION 'invalid AI request feature';
  END IF;
  IF p_daily_limit < 1 OR p_daily_limit > 1000
    OR p_cooldown_seconds < 0 OR p_cooldown_seconds > 3600
  THEN
    RAISE EXCEPTION 'invalid AI request limits';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::TEXT || ':' || p_feature, 0)
  );

  SELECT * INTO v_existing
  FROM public.ai_requests
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND client_request_id = p_client_request_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'duplicate', TRUE,
      'reason', 'duplicate',
      'requestId', v_existing.id,
      'status', v_existing.status
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ai_requests
    WHERE user_id = p_user_id
      AND feature = p_feature
      AND status = 'claimed'
      AND created_at > NOW() - INTERVAL '2 minutes'
  ) THEN
    RETURN jsonb_build_object('allowed', FALSE, 'duplicate', FALSE, 'reason', 'in_flight');
  END IF;

  IF p_cooldown_seconds > 0 AND EXISTS (
    SELECT 1 FROM public.ai_requests
    WHERE user_id = p_user_id
      AND feature = p_feature
      AND created_at > NOW() - make_interval(secs => p_cooldown_seconds)
  ) THEN
    RETURN jsonb_build_object('allowed', FALSE, 'duplicate', FALSE, 'reason', 'cooldown');
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_recent_count
  FROM public.ai_requests
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_recent_count >= p_daily_limit THEN
    RETURN jsonb_build_object('allowed', FALSE, 'duplicate', FALSE, 'reason', 'daily_limit');
  END IF;

  INSERT INTO public.ai_requests (user_id, client_request_id, feature)
  VALUES (p_user_id, p_client_request_id, p_feature)
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'allowed', TRUE,
    'duplicate', FALSE,
    'reason', NULL,
    'requestId', v_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.edge_finish_ai_request(
  p_user_id UUID,
  p_request_id UUID,
  p_status TEXT,
  p_model TEXT DEFAULT NULL,
  p_used_ai BOOLEAN DEFAULT FALSE,
  p_failure_code TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'invalid AI request result';
  END IF;

  UPDATE public.ai_requests
  SET status = p_status,
      model = NULLIF(p_model, ''),
      used_ai = p_used_ai,
      failure_code = LEFT(NULLIF(p_failure_code, ''), 80),
      finished_at = NOW()
  WHERE id = p_request_id
    AND user_id = p_user_id
    AND status = 'claimed';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.edge_resolve_chat_adjustment(
  p_user_id UUID,
  p_message_id UUID,
  p_decision TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_message public.chat_messages%ROWTYPE;
  v_base_package public.exercise_packages%ROWTYPE;
  v_workout JSONB;
  v_new_package_id UUID;
  v_exercise_count INTEGER;
BEGIN
  IF p_decision NOT IN ('apply', 'decline') THEN
    RAISE EXCEPTION 'invalid adjustment decision';
  END IF;

  SELECT * INTO v_message
  FROM public.chat_messages
  WHERE id = p_message_id
    AND user_id = p_user_id
    AND role = 'assistant'
    AND kind = 'adjustment'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'adjustment not found'; END IF;

  IF v_message.adjustment_status <> 'pending' THEN
    RETURN jsonb_build_object(
      'status', v_message.adjustment_status,
      'packageId', v_message.applied_package_id,
      'duplicate', TRUE
    );
  END IF;

  IF p_decision = 'decline' THEN
    UPDATE public.chat_messages
    SET adjustment_status = 'declined'
    WHERE id = p_message_id;
    UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = v_message.session_id;
    RETURN jsonb_build_object('status', 'declined', 'packageId', NULL, 'duplicate', FALSE);
  END IF;

  IF jsonb_typeof(v_message.adjustment_payload) <> 'object'
    OR jsonb_typeof(v_message.adjustment_payload->'workout') <> 'object'
  THEN
    RAISE EXCEPTION 'adjustment payload is invalid';
  END IF;

  v_workout := v_message.adjustment_payload->'workout';
  IF jsonb_typeof(v_workout->'exercises') <> 'array' THEN
    RAISE EXCEPTION 'adjustment exercises are invalid';
  END IF;
  v_exercise_count := jsonb_array_length(v_workout->'exercises');
  IF v_exercise_count < 3 OR v_exercise_count > 10 THEN
    RAISE EXCEPTION 'adjustment exercise count is invalid';
  END IF;

  SELECT * INTO v_base_package
  FROM public.exercise_packages
  WHERE id = (v_message.adjustment_payload->>'basePackageId')::UUID
    AND user_id = p_user_id
    AND status = 'active'
    AND generation_status = 'ready'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active package not found'; END IF;

  INSERT INTO public.exercise_packages (
    user_id,
    week_start,
    scheduled_for,
    name,
    difficulty_level,
    purpose,
    estimated_minutes,
    generated_by_ai,
    generation_status,
    status
  ) VALUES (
    p_user_id,
    v_base_package.week_start,
    v_base_package.scheduled_for,
    btrim(v_workout->>'name'),
    v_workout->>'difficulty',
    btrim(v_workout->>'purpose'),
    (v_workout->>'estimatedMinutes')::INTEGER,
    v_message.generated_by_ai,
    'ready',
    'active'
  ) RETURNING id INTO v_new_package_id;

  INSERT INTO public.sub_exercises (
    package_id,
    user_id,
    name,
    mode,
    sets,
    repetitions,
    duration_seconds,
    rest_seconds,
    order_index,
    instruction
  )
  SELECT
    v_new_package_id,
    p_user_id,
    btrim(exercise.value->>'name'),
    exercise.value->>'mode',
    (exercise.value->>'sets')::INTEGER,
    CASE WHEN exercise.value->>'repetitions' IS NULL THEN NULL
      ELSE (exercise.value->>'repetitions')::INTEGER END,
    CASE WHEN exercise.value->>'durationSeconds' IS NULL THEN NULL
      ELSE (exercise.value->>'durationSeconds')::INTEGER END,
    (exercise.value->>'restSeconds')::INTEGER,
    exercise.ordinality::INTEGER,
    btrim(exercise.value->>'instruction')
  FROM jsonb_array_elements(v_workout->'exercises') WITH ORDINALITY AS exercise(value, ordinality);

  UPDATE public.exercise_packages
  SET status = 'replaced'
  WHERE id = v_base_package.id;

  UPDATE public.chat_messages
  SET adjustment_status = 'applied', applied_package_id = v_new_package_id
  WHERE id = p_message_id;
  UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = v_message.session_id;

  RETURN jsonb_build_object(
    'status', 'applied',
    'packageId', v_new_package_id,
    'replacedPackageId', v_base_package.id,
    'duplicate', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edge_claim_ai_request(UUID, TEXT, UUID, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.edge_finish_ai_request(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.edge_resolve_chat_adjustment(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.edge_claim_ai_request(UUID, TEXT, UUID, INTEGER, INTEGER)
  TO project_admin;
GRANT EXECUTE ON FUNCTION public.edge_finish_ai_request(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT)
  TO project_admin;
GRANT EXECUTE ON FUNCTION public.edge_resolve_chat_adjustment(UUID, UUID, TEXT)
  TO project_admin;
