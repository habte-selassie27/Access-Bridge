import { GroqVisionOCRAdapter } from "./ocr.adapter";
import { GeminiOCRAdapter } from "./gemini.adapter";
import { ENV } from "../../config/env";
export function createOCR(): any {
  if (ENV.geminiApiKey) return new GeminiOCRAdapter(ENV.geminiApiKey);
  if (ENV.groqApiKey) return new GroqVisionOCRAdapter(ENV.groqApiKey);
  return null;
}
