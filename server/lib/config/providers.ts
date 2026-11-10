export type LLMProvider = "groq" | "mistral" | "none";
export type OCRProvider = "groq-vision" | "none";
export type TTSProvider = "webspeech" | "none";

export function selectedLLMProvider(): LLMProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.MISTRAL_API_KEY) return "mistral";
  return "none";
}
export function selectedOCRProvider(): OCRProvider {
  return process.env.GROQ_API_KEY ? "groq-vision" : "none";
}
