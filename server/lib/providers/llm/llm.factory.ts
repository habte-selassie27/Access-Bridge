import { GroqAdapter, MistralAdapter } from "./llm.adapter";
import { ENV } from "../../config/env";

export type LLMAdapter = GroqAdapter | MistralAdapter;

export function createLLM(): LLMAdapter | null {
  // Priority: Groq first, then Mistral, then demo-only.
  if (ENV.groqApiKey) {
    // Groq's token window is short and narrow (8,000 tokens, about twelve
    // seconds). The adapter waits it out instead of failing the request.
    return new GroqAdapter(ENV.groqApiKey, ENV.groqModel, {
      retries: 2,
      baseDelayMs: 13_000,
      reasoningEffort: "low",
    });
  }

  if (ENV.mistralApiKey) {
    return new MistralAdapter(ENV.mistralApiKey, "mistral-large-latest", {
      retries: 2,
      baseDelayMs: 13_000,
    });
  }

  return null;
}
