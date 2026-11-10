import { GroqAdapter } from "./llm.adapter";
import { ENV } from "../../config/env";

export function createLLM(): GroqAdapter | null {
  if (!ENV.groqApiKey) return null;
  // Groq's token window is short and narrow (8,000 tokens, about twelve
  // seconds). The adapter waits it out instead of failing the request.
  return new GroqAdapter(ENV.groqApiKey, ENV.groqModel, {
    retries: 2,
    baseDelayMs: 13_000,
    reasoningEffort: "low",
  });
}
