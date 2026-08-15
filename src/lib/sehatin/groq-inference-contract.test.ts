import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const functionSource = readFileSync(
  resolve(process.cwd(), "functions/sehatin-program.ts"),
  "utf8",
);

describe("Sehat.in direct Groq inference contract", () => {
  it("calls Groq directly with GPT-OSS 120B", () => {
    expect(functionSource).toContain(
      'const defaultModel = "openai/gpt-oss-120b";',
    );
    expect(functionSource).toContain(
      'const groqChatCompletionsUrl = "https://api.groq.com/openai/v1/chat/completions";',
    );
    expect(functionSource).toContain(
      'const apiKey = Deno.env.get("GROQ_API_KEY");',
    );
    expect(functionSource).toContain("fetch(groqChatCompletionsUrl");
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

  it("keeps deterministic fallbacks for program and chat inference failures", () => {
    expect(functionSource).toContain(
      "const plan = modelResult.ok ? modelResult.data : fallbackPlan(context, reason);",
    );
    expect(functionSource).toContain(
      "const reply = modelResult.ok ? modelResult.data : fallback;",
    );
    expect(functionSource).toContain("generated_by_ai: modelResult.ok");
  });
});
