import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Lovable AI Gateway provider (OpenAI-compatible).
 * Uses the auto-provisioned LOVABLE_API_KEY — no user setup required.
 * Kept named `createGeminiProvider` for call-site compatibility.
 */
export function createGeminiProvider() {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const provider = createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  // Normalize bare model ids (e.g. "gemini-3-flash-preview") to the
  // catalog-required "google/…" prefix expected by Lovable AI Gateway.
  return ((modelId: string) =>
    provider(modelId.includes("/") ? modelId : `google/${modelId}`)) as typeof provider;
}
