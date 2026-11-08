export interface LLMProvider {
  complete(system: string, user: string, maxTokens?: number): Promise<string>;
}
export interface OCRProvider {
  extractText(fileBase64: string, mime: string): Promise<string>;
}
export interface TTSProvider {
  synthesize(text: string, lang: string): Promise<Buffer | null>;
}
