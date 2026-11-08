import { GroqAdapter } from "./llm.adapter";
import { ENV } from "../../config/env";
export function createLLM(): GroqAdapter | null {
  if (!ENV.groqApiKey) return null;
  return new GroqAdapter(ENV.groqApiKey);
}
