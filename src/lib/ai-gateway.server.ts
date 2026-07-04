import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Direct Google Gemini provider using the OpenAI-compatible endpoint.
 * Reads GEMINI_API_KEY from Replit Secrets / environment variables.
 */
export function createGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
