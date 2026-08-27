import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const functionSource = readFileSync(
  resolve(process.cwd(), "functions/sehatin-program.ts"),
  "utf8",
);

describe("Sehat.in direct Groq inference contract", () => {
  it("uses Qwen 3.8 27B first and GPT-OSS 120B as the Groq fallback", () => {
    expect(functionSource).toContain(
      'const defaultPrimaryModel = "qwen/qwen3.8-27b";',
    );
    expect(functionSource).toContain(
      'const defaultSecondaryModel = "openai/gpt-oss-120b";',
    );
    expect(functionSource).toContain(
      'const groqChatCompletionsUrl = "https://api.groq.com/openai/v1/chat/completions";',
    );
    expect(functionSource).toContain(
      'const apiKey = Deno.env.get("GROQ_API_KEY");',
    );
    expect(functionSource).toContain("fetch(groqChatCompletionsUrl");
    expect(functionSource).toContain('Deno.env.get("GROQ_PRIMARY_MODEL")');
    expect(functionSource).toContain('Deno.env.get("GROQ_SECONDARY_MODEL")');
    expect(functionSource).toContain("const primaryResult = await callGroqModel(");
    expect(functionSource).toContain("const secondaryResult = await callGroqModel(");
    expect(functionSource).toContain("if (secondaryResult.ok) return secondaryResult;");
    expect(functionSource).toContain("groq_fallback_exhausted:");
    expect(functionSource).not.toContain("openrouter.ai");
    expect(functionSource).not.toContain("OPENROUTER_");
    expect(functionSource).not.toMatch(/provider:\s*\{/);
  });

  it("uses strict structured output for both program and chat generation", () => {
    expect(functionSource).toMatch(/strict:\s*true/);
    expect(functionSource).toMatch(
      /callGroq\(\s*generatedPlanSchema,\s*"sehatin_program"/,
    );
    expect(functionSource).toMatch(
      /callGroq\(\s*chatReplySchema,\s*"sehatin_chat_reply"/,
    );
  });

  it("keeps deterministic fallbacks after both LLM attempts fail", () => {
    expect(functionSource).toContain(
      "const plan = modelResult.ok ? modelResult.data : fallbackPlan(context, reason);",
    );
    expect(functionSource).toContain(
      "const reply = modelResult.ok ? modelResult.data : fallback;",
    );
    expect(functionSource).toContain("generated_by_ai: modelResult.ok");
  });

  it("keeps food chat adjustments small enough for strict structured output", () => {
    expect(functionSource).toContain("meal: mealSchema.nullable()");
    expect(functionSource).not.toContain("meals: z.array(mealSchema).length(4).nullable()");
    expect(functionSource).toMatch(/"sehatin_chat_reply"[\s\S]*?2000,/);
    expect(functionSource).toContain('reasoning_effort: "low"');
    expect(functionSource).toMatch(/\/bubur\/\.test\(normalized\)/);
  });

  it("uses the latest workout result and consecutive weekly misses for adaptation", () => {
    expect(functionSource).toContain("latestWorkoutResult");
    expect(functionSource).toContain("deriveWorkoutAdaptation");
    expect(functionSource).toMatch(
      /recentGoalStatuses\.length === 2\s*&& recentGoalStatuses\.every\(\(status\) => status === "missed"\)/,
    );
  });

  it("automatically regenerates recommendations at each PRD trigger", () => {
    expect(functionSource).toMatch(
      /action === "complete-onboarding"[\s\S]*generateAndPersist\([\s\S]*"onboarding"/,
    );
    expect(functionSource).toMatch(
      /action === "record-weight"[\s\S]*shouldRecalibrate[\s\S]*"weight-update"/,
    );
    expect(functionSource).toMatch(
      /edge_complete_workout_session[\s\S]*generateAndPersist\([\s\S]*"workout-complete"/,
    );
  });
});
