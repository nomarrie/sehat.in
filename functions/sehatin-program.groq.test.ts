import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  callGroqModel,
  tryAiPlan,
  type UserContext,
} from "./sehatin-program";

describe("Groq request token budgeting", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps Qwen completion requests at its 1,000 OTPM limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "qwen/qwen3.8-27b",
      choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
      usage: { prompt_tokens: 20, completion_tokens: 10 },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await callGroqModel(
      z.object({ ok: z.boolean() }),
      "test_schema",
      [{ role: "user", content: "Generate a daily plan" }],
      3_000,
      "test-api-key",
      "qwen/qwen3.8-27b",
    );

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.max_completion_tokens).toBe(1_000);
  });

  it("starts full-plan structured output with GPT-OSS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("Deno", {
      env: {
        get: (name: string) => ({
          GROQ_API_KEY: "test-api-key",
          GROQ_PRIMARY_MODEL: "qwen/qwen3.8-27b",
          GROQ_SECONDARY_MODEL: "openai/gpt-oss-120b",
        })[name],
      },
    });

    const newUserContext: UserContext = {
      profile: {
        current_weight_kg: 80,
        target_weight_kg: 70,
        weekly_target_kg: 0.5,
        activity_level: "pemula",
        meal_preference: "seimbang",
        ai_processing_consent_at: "2026-09-05T00:00:00.000Z",
        ai_processing_consent_version: "2026-08-14",
      },
      weightLogs: [],
      weeklyGoals: [],
      latestPackage: null,
      latestExercises: [],
      latestWorkoutResult: null,
    };

    await tryAiPlan(newUserContext, "onboarding", "2026-09-05");

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const firstBody = JSON.parse(String(firstRequest.body));
    expect(firstBody.model).toBe("openai/gpt-oss-120b");
    expect(firstBody.max_completion_tokens).toBe(3_000);

    const fallbackRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const fallbackBody = JSON.parse(String(fallbackRequest.body));
    expect(fallbackBody.model).toBe("qwen/qwen3.8-27b");
    expect(fallbackBody.max_completion_tokens).toBe(1_000);
  });
});
