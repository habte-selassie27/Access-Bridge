export type LLMProvider = "groq" | "none";
export type OCRProvider = "groq-vision" | "none";
export type TTSProvider = "webspeech" | "none";

export function selectedLLMProvider(): LLMProvider {
  return process.env.GROQ_API_KEY ? "groq" : "none";
}
export function selectedOCRProvider(): OCRProvider {
  return process.env.GROQ_API_KEY ? "groq-vision" : "none";
}
