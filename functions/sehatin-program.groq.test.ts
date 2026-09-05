import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  callGroqModel,
  tryAiPlan,
  type UserContext,
} from "./sehatin-program";

describe("Groq request token budgeting", () => {
  afterEach(() => {
    vi.useRealTimers();
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
    expect(firstBody.max_completion_tokens).toBe(2_400);

    const fallbackRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const fallbackBody = JSON.parse(String(fallbackRequest.body));
    expect(fallbackBody.model).toBe("qwen/qwen3.8-27b");
    expect(fallbackBody.max_completion_tokens).toBe(1_000);
  });

  it("retries the same model once after a short token rate limit", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Rate limit reached on tokens per minute (TPM)" },
      }), {
        status: 429,
        headers: {
          "retry-after": "0.001",
          "x-ratelimit-remaining-tokens": "0",
        },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        model: "openai/gpt-oss-120b",
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        usage: { prompt_tokens: 20, completion_tokens: 10 },
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = callGroqModel(
      z.object({ ok: z.boolean() }),
      "test_schema",
      [{ role: "user", content: "Generate a daily plan" }],
      2_400,
      "test-api-key",
      "openai/gpt-oss-120b",
    );
    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry the same model when the rate-limit reset is too far away", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: "Rate limit reached on requests per day (RPD)" },
    }), {
      status: 429,
      headers: {
        "retry-after": "3600",
        "x-ratelimit-remaining-requests": "0",
        "x-ratelimit-remaining-tokens": "0",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGroqModel(
      z.object({ ok: z.boolean() }),
      "test_schema",
      [{ role: "user", content: "Generate a daily plan" }],
      2_400,
      "test-api-key",
      "openai/gpt-oss-120b",
    );

    expect(result).toEqual({
      ok: false,
      code: "groq_rate_limit_requests",
      model: "openai/gpt-oss-120b",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a specific rate-limit code after the short retry is exhausted", async () => {
    const rateLimitedResponse = () => new Response(JSON.stringify({
      error: { message: "Rate limit reached on tokens per minute (TPM)" },
    }), {
      status: 429,
      headers: {
        "retry-after": "0",
        "x-ratelimit-remaining-tokens": "0",
      },
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimitedResponse())
      .mockResolvedValueOnce(rateLimitedResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGroqModel(
      z.object({ ok: z.boolean() }),
      "test_schema",
      [{ role: "user", content: "Generate a daily plan" }],
      2_400,
      "test-api-key",
      "openai/gpt-oss-120b",
    );

    expect(result).toEqual({
      ok: false,
      code: "groq_rate_limit_tokens",
      model: "openai/gpt-oss-120b",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the other model instead of waiting for a daily reset", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: "Rate limit reached on requests per day (RPD)" },
      }), {
        status: 429,
        headers: {
          "retry-after": "3600",
          "x-ratelimit-remaining-requests": "0",
        },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        model: "qwen/qwen3.8-27b",
        choices: [{ message: { content: JSON.stringify({
          workout: {
            name: "Latihan ringan",
            difficulty: "pemula",
            purpose: "Membantu membangun kebiasaan bergerak secara bertahap.",
            estimatedMinutes: 20,
            exercises: [],
          },
          meals: [],
        }) } }],
      }), { status: 200 }));
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body));
    expect(firstBody.model).toBe("openai/gpt-oss-120b");
    expect(secondBody.model).toBe("qwen/qwen3.8-27b");
  });
});
