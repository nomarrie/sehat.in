export type ProfileRow = {
  user_id: string;
  full_name: string;
  age: number;
  height_cm: string | number;
  initial_weight_kg: string | number;
  current_weight_kg: string | number;
  target_weight_kg: string | number;
  goal_direction: "lose" | "gain";
  weekly_target_kg: string | number;
  activity_level: "pemula" | "menengah" | "aktif";
  meal_preference: "seimbang" | "tinggi-protein" | "nabati";
  ai_processing_consent_at: string | null;
  ai_processing_consent_version: string | null;
  reminder_enabled: boolean;
  reminder_time: string;
  weekly_summary_enabled: boolean;
  time_zone: string;
  onboarding_completed_at: string | null;
};

export type WeeklyGoalRow = {
  start_weight_kg: string | number;
  target_weight_kg: string | number;
  status: "active" | "met" | "missed";
  goal_direction: "lose" | "gain";
};

export type WeightLogRow = {
  weight_kg: string | number;
  logged_on: string;
};

export type ExercisePackageRow = {
  id: string;
  name: string;
  scheduled_for: string;
  generated_by_ai: boolean;
  difficulty_level: "pemula" | "menengah";
  purpose: string;
  estimated_minutes: number;
};

export type SubExerciseRow = {
  id: string;
  name: string;
  mode: "timed" | "repetitions";
  sets: number;
  repetitions: number | null;
  duration_seconds: number | null;
  rest_seconds: number;
  order_index: number;
  instruction: string;
};
