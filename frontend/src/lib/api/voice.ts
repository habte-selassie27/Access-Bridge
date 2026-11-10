import { fetchAPI } from "./client.ts";
import type { LangCode } from "./types.ts";

export interface VoiceStudioTranslateRequest {
  text: string;
  lang: LangCode;
  /** Target language the reader wants to see and hear. */
  targetLang: LangCode;
}

export interface VoiceStudioTranslateResponse {
  translated: string;
  lang: LangCode;
}

export async function translateForVoiceStudio(
  req: VoiceStudioTranslateRequest
): Promise<{
  data: VoiceStudioTranslateResponse;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<VoiceStudioTranslateResponse>("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: req.text,
      lang: req.targetLang,
      sourceLanguage: req.lang,
      mode: "document",
    }),
  });
}
