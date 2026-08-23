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
  v_target TEXT;
  v_base_package public.exercise_packages%ROWTYPE;
  v_workout JSONB;
  v_new_package_id UUID;
  v_exercise_count INTEGER;
  v_base_set public.nutrition_recommendation_sets%ROWTYPE;
  v_base_meal public.nutrition_recommendations%ROWTYPE;
  v_meal JSONB;
  v_new_set_id UUID;
  v_recommendation_id UUID;
  v_base_meal_count INTEGER;
  v_replacement_count INTEGER;
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
  v_target := COALESCE(v_message.adjustment_payload->>'target', 'workout');
  IF v_target NOT IN ('workout', 'food') THEN
    RAISE EXCEPTION 'adjustment target is invalid';
  END IF;

  IF v_message.adjustment_status <> 'pending' THEN
    RETURN jsonb_build_object(
      'status', v_message.adjustment_status,
      'target', v_target,
      'packageId', v_message.applied_package_id,
      'recommendationSetId', v_message.applied_recommendation_set_id,
      'duplicate', TRUE
    );
  END IF;

  IF p_decision = 'decline' THEN
    UPDATE public.chat_messages SET adjustment_status = 'declined' WHERE id = p_message_id;
    UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = v_message.session_id;
    RETURN jsonb_build_object(
      'status', 'declined', 'target', v_target, 'packageId', NULL,
      'recommendationSetId', NULL, 'duplicate', FALSE
    );
  END IF;

  IF v_target = 'workout' THEN
    IF jsonb_typeof(v_message.adjustment_payload->'workout') <> 'object' THEN
      RAISE EXCEPTION 'workout adjustment payload is invalid';
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
      user_id, week_start, scheduled_for, name, difficulty_level, purpose,
      estimated_minutes, generated_by_ai, generation_status, status
    ) VALUES (
      p_user_id, v_base_package.week_start, v_base_package.scheduled_for,
      btrim(v_workout->>'name'), v_workout->>'difficulty',
      btrim(v_workout->>'purpose'), (v_workout->>'estimatedMinutes')::INTEGER,
      v_message.generated_by_ai, 'ready', 'active'
    ) RETURNING id INTO v_new_package_id;

    INSERT INTO public.sub_exercises (
      package_id, user_id, name, mode, sets, repetitions, duration_seconds,
      rest_seconds, order_index, instruction
    )
    SELECT
      v_new_package_id, p_user_id, btrim(exercise.value->>'name'),
      exercise.value->>'mode', (exercise.value->>'sets')::INTEGER,
      CASE WHEN exercise.value->>'repetitions' IS NULL THEN NULL
        ELSE (exercise.value->>'repetitions')::INTEGER END,
      CASE WHEN exercise.value->>'durationSeconds' IS NULL THEN NULL
        ELSE (exercise.value->>'durationSeconds')::INTEGER END,
      (exercise.value->>'restSeconds')::INTEGER, exercise.ordinality::INTEGER,
      btrim(exercise.value->>'instruction')
    FROM jsonb_array_elements(v_workout->'exercises') WITH ORDINALITY AS exercise(value, ordinality);

    UPDATE public.exercise_packages SET status = 'replaced' WHERE id = v_base_package.id;
    UPDATE public.chat_messages
    SET adjustment_status = 'applied', applied_package_id = v_new_package_id
    WHERE id = p_message_id;
    UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = v_message.session_id;

    RETURN jsonb_build_object(
      'status', 'applied', 'target', 'workout',
      'packageId', v_new_package_id, 'replacedPackageId', v_base_package.id,
      'recommendationSetId', NULL, 'duplicate', FALSE
    );
  END IF;

  IF jsonb_typeof(v_message.adjustment_payload->'meal') = 'object' THEN
    v_meal := v_message.adjustment_payload->'meal';
  ELSIF jsonb_typeof(v_message.adjustment_payload->'meals') = 'array' THEN
    SELECT candidate.value INTO v_meal
    FROM jsonb_array_elements(v_message.adjustment_payload->'meals') AS candidate(value)
    WHERE candidate.value->>'mealType' = v_message.adjustment_payload->'rows'->0->>'label'
    LIMIT 1;
  END IF;

  IF v_meal IS NULL
    OR jsonb_typeof(v_meal->'ingredients') <> 'array'
    OR jsonb_array_length(v_meal->'ingredients') < 2
    OR jsonb_array_length(v_meal->'ingredients') > 20
    OR jsonb_typeof(v_meal->'cookingSteps') <> 'array'
    OR jsonb_array_length(v_meal->'cookingSteps') < 2
    OR jsonb_array_length(v_meal->'cookingSteps') > 20
  THEN
    RAISE EXCEPTION 'food adjustment payload is invalid';
  END IF;

  SELECT * INTO v_base_set
  FROM public.nutrition_recommendation_sets
  WHERE id = (v_message.adjustment_payload->>'baseRecommendationSetId')::UUID
    AND user_id = p_user_id
    AND generation_status = 'ready'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'recommendation set not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.nutrition_recommendation_sets
    WHERE user_id = p_user_id AND generation_status = 'ready'
      AND created_at > v_base_set.created_at
  ) THEN
    RAISE EXCEPTION 'recommendation set has changed';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE meal_type = v_meal->>'mealType')
  INTO v_base_meal_count, v_replacement_count
  FROM public.nutrition_recommendations
  WHERE recommendation_set_id = v_base_set.id AND user_id = p_user_id;
  IF v_base_meal_count <> 4 OR v_replacement_count <> 1 THEN
    RAISE EXCEPTION 'base recommendation meals are invalid';
  END IF;

  INSERT INTO public.nutrition_recommendation_sets (
    user_id, based_on_weight_kg, generated_by_ai, generation_status
  ) VALUES (
    p_user_id, v_base_set.based_on_weight_kg, v_message.generated_by_ai, 'generating'
  ) RETURNING id INTO v_new_set_id;

  FOR v_base_meal IN
    SELECT * FROM public.nutrition_recommendations
    WHERE recommendation_set_id = v_base_set.id AND user_id = p_user_id
    ORDER BY order_index
  LOOP
    IF v_base_meal.meal_type = v_meal->>'mealType' THEN
      INSERT INTO public.nutrition_recommendations (
        recommendation_set_id, user_id, meal_type, name, description, rationale,
        prep_minutes, servings, calories, protein_grams, carbs_grams, fat_grams,
        fiber_grams, order_index
      ) VALUES (
        v_new_set_id, p_user_id, v_meal->>'mealType', btrim(v_meal->>'name'),
        btrim(v_meal->>'description'), btrim(v_meal->>'rationale'),
        (v_meal->>'prepMinutes')::INTEGER, (v_meal->>'servings')::INTEGER,
        (v_meal->'nutrition'->>'calories')::INTEGER,
        (v_meal->'nutrition'->>'proteinGrams')::NUMERIC,
        (v_meal->'nutrition'->>'carbsGrams')::NUMERIC,
        (v_meal->'nutrition'->>'fatGrams')::NUMERIC,
        (v_meal->'nutrition'->>'fiberGrams')::NUMERIC,
        v_base_meal.order_index
      ) RETURNING id INTO v_recommendation_id;

      INSERT INTO public.nutrition_ingredients (
        recommendation_id, user_id, amount, name, order_index
      )
      SELECT v_recommendation_id, p_user_id, btrim(item.value->>'amount'),
        btrim(item.value->>'name'), item.ordinality::INTEGER
      FROM jsonb_array_elements(v_meal->'ingredients') WITH ORDINALITY AS item(value, ordinality);

      INSERT INTO public.nutrition_steps (
        recommendation_id, user_id, instruction, order_index
      )
      SELECT v_recommendation_id, p_user_id, btrim(item.value #>> '{}'),
        item.ordinality::INTEGER
      FROM jsonb_array_elements(v_meal->'cookingSteps') WITH ORDINALITY AS item(value, ordinality);
    ELSE
      INSERT INTO public.nutrition_recommendations (
        recommendation_set_id, user_id, meal_type, name, description, rationale,
        prep_minutes, servings, calories, protein_grams, carbs_grams, fat_grams,
        fiber_grams, order_index
      ) VALUES (
        v_new_set_id, p_user_id, v_base_meal.meal_type, v_base_meal.name,
        v_base_meal.description, v_base_meal.rationale, v_base_meal.prep_minutes,
        v_base_meal.servings, v_base_meal.calories, v_base_meal.protein_grams,
        v_base_meal.carbs_grams, v_base_meal.fat_grams, v_base_meal.fiber_grams,
        v_base_meal.order_index
      ) RETURNING id INTO v_recommendation_id;

      INSERT INTO public.nutrition_ingredients (
        recommendation_id, user_id, amount, name, order_index
      )
      SELECT v_recommendation_id, p_user_id, amount, name, order_index
      FROM public.nutrition_ingredients
      WHERE recommendation_id = v_base_meal.id AND user_id = p_user_id;

      INSERT INTO public.nutrition_steps (
        recommendation_id, user_id, instruction, order_index
      )
      SELECT v_recommendation_id, p_user_id, instruction, order_index
      FROM public.nutrition_steps
      WHERE recommendation_id = v_base_meal.id AND user_id = p_user_id;
    END IF;
  END LOOP;

  UPDATE public.nutrition_recommendation_sets
  SET generation_status = 'ready' WHERE id = v_new_set_id;
  UPDATE public.chat_messages
  SET adjustment_status = 'applied', applied_recommendation_set_id = v_new_set_id
  WHERE id = p_message_id;
  UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = v_message.session_id;

  RETURN jsonb_build_object(
    'status', 'applied', 'target', 'food', 'packageId', NULL,
    'recommendationSetId', v_new_set_id, 'duplicate', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.edge_resolve_chat_adjustment(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edge_resolve_chat_adjustment(UUID, UUID, TEXT)
  TO project_admin;
