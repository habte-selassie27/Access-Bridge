import { fetchAPI } from "./client.ts";

export interface TTSRequest {
  text: string;
  lang: string;
}

export interface TTSResponse {
  fallback: "webspeech";
  supported: boolean;
}

export async function speakText(req: TTSRequest): Promise<{
  data: TTSResponse;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<TTSResponse>("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
