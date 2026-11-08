import { GroqVisionOCRAdapter } from "./ocr.adapter";
import { ENV } from "../../config/env";
export function createOCR(): GroqVisionOCRAdapter | null {
  if (!ENV.groqApiKey) return null;
  return new GroqVisionOCRAdapter(ENV.groqApiKey);
}
