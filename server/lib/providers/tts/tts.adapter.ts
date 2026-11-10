/**
 * Server-side text to speech.
 *
 * The browser's own speech synthesis is the default, because it needs no key
 * and no network. It is also unreliable for the languages this product
 * exists for: a phone with no Amharic voice reads nothing, and a phone with
 * no Arabic voice reads gibberish rather than admitting it cannot.
 *
 * So when a provider key is configured, the audio is made on the server and
 * the phone only has to play it. Three providers are supported, chosen with
 * TTS_PROVIDER:
 *
 *   openai     POST {base}/audio/speech     (OpenAI and compatible gateways)
 *   elevenlabs POST {base}/text-to-speech/{voice}
 *   google     POST {base}/v1/text:synthesize
 *   gemini     POST {base}/models/{model}:generateContent  (Gemini TTS)
 *
 * There is also a keyless provider for self-hosting:
 *
 *   local      POST {base}/audio/speech     (OpenAI-compatible local server,
 *                                             e.g. Kokoro-FastAPI or Piper)
 *
 * `local` needs no API key, only TTS_BASE_URL. It lets an operator run speech
 * on their own machine or private network, which is the right shape for
 * low-resource languages and offline demos. If no provider is configured at
 * all, the adapter returns null and the caller falls back to the browser.
 */

export type TTSProviderName = "openai" | "elevenlabs" | "google" | "gemini" | "local" | "none";

export interface SpeechAudio {
  audio: Buffer;
  mimeType: string;
}

export interface TTSConfig {
  provider: TTSProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  voice: string;
}

const DEFAULTS: Record<TTSProviderName, { baseUrl: string; model: string; voice: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini-tts", voice: "alloy" },
  elevenlabs: { baseUrl: "https://api.elevenlabs.io/v1", model: "eleven_multilingual_v2", voice: "21m00Tcm4TlvDq8ikWAM" },
  google: { baseUrl: "https://texttospeech.googleapis.com", model: "ssml-voice", voice: "en-US-Neural2-F" },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-3.8-flash-tts", voice: "Kore" },
  local: { baseUrl: "http://127.0.0.1:8880/v1", model: "kokoro", voice: "af_heart" },
  none: { baseUrl: "", model: "", voice: "" },
};

/** A voice per language, so a French document is not read in an English voice. */
const VOICES: Record<string, { openai: string; elevenlabs: string; google: string }> = {
  en: { openai: "alloy", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "en-US-Neural2-F" },
  am: { openai: "nova", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "am-ET-Neural2-A" },
  om: { openai: "nova", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "en-US-Neural2-F" },
  ti: { openai: "nova", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "en-US-Neural2-F" },
  sw: { openai: "shimmer", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "sw-KE-Neural2-A" },
  ar: { openai: "shimmer", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "ar-XA-Neural2-A" },
  fr: { openai: "shimmer", elevenlabs: "21m00Tcm4TlvDq8ikWAM", google: "fr-FR-Neural2-A" },
};

export function ttsConfig(): TTSConfig {
  const provider = (process.env.TTS_PROVIDER || "").toLowerCase() as TTSProviderName;
  const key = process.env.TTS_PROVIDER_KEY || process.env.TTS_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const base = process.env.TTS_BASE_URL || "";
  const selected: TTSProviderName =
    provider && provider !== "none"
      ? provider in DEFAULTS
        ? provider
        : "none"
      : key
        ? "openai"
        : geminiKey
          ? "gemini"
          : base
            ? "local"
            : "none";
  const defaults = DEFAULTS[selected] ?? DEFAULTS.openai;
  return {
    provider: selected,
    // The Gemini key is separate from the generic TTS provider key.
    apiKey: selected === "gemini" ? geminiKey || key : key,
    baseUrl: (process.env.TTS_BASE_URL || defaults.baseUrl).replace(/\/+$/, ""),
    model: process.env.TTS_MODEL || defaults.model,
    voice: process.env.TTS_VOICE_ID || defaults.voice,
  };
}

export function ttsAvailable(): boolean {
  const config = ttsConfig();
  if (config.provider === "none") return false;
  // A self-hosted server is keyless by design. Hosted providers need a key.
  if (config.provider === "local") return Boolean(config.baseUrl);
  return Boolean(config.apiKey);
}

const LANG_NAMES: Record<string, string> = {
  en: "English",
  am: "Amharic",
  om: "Afaan Oromo",
  ti: "Tigrinya",
  sw: "Swahili",
  ar: "Arabic",
  fr: "French",
};

function voiceFor(config: TTSConfig, lang: string): string {
  if (config.provider === "local" || config.provider === "gemini") return config.voice;
  const table = VOICES[lang] ?? VOICES.en;
  if (config.provider === "openai") return table.openai;
  if (config.provider === "elevenlabs") return table.elevenlabs;
  return table.google;
}

/**
 * Make the audio.
 *
 * Returns the audio bytes, or null when no provider is configured or the
 * provider failed. The caller falls back to the browser's voice.
 */
export async function synthesizeSpeech(text: string, lang: string): Promise<SpeechAudio | null> {
  const config = ttsConfig();
  if (!ttsAvailable() || !text.trim()) return null;

  const clean = text.slice(0, 4000);
  const signal = AbortSignal.timeout(20_000);

  try {
    if (config.provider === "local") {
      const response = await fetch(`${config.baseUrl}/audio/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          voice: voiceFor(config, lang),
          input: clean,
          response_format: "mp3",
        }),
        signal,
      });
      if (!response.ok) return null;
      return { audio: Buffer.from(await response.arrayBuffer()), mimeType: "audio/mpeg" };
    }
    if (config.provider === "openai") {
      const response = await fetch(`${config.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          voice: voiceFor(config, lang),
          input: clean,
          response_format: "mp3",
        }),
        signal,
      });
      if (!response.ok) return null;
      return { audio: Buffer.from(await response.arrayBuffer()), mimeType: "audio/mpeg" };
    }

    if (config.provider === "elevenlabs") {
      const voice = process.env.TTS_VOICE_ID || voiceFor(config, lang);
      const response = await fetch(`${config.baseUrl}/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": config.apiKey,
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: clean,
          model_id: config.model,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });
      if (!response.ok) return null;
      return { audio: Buffer.from(await response.arrayBuffer()), mimeType: "audio/mpeg" };
    }

    if (config.provider === "google") {
      const response = await fetch(`${config.baseUrl}/v1/text:synthesize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": config.apiKey,
        },
        body: JSON.stringify({
          input: { text: clean },
          voice: {
            languageCode: lang === "am" ? "am-ET" : lang === "ti" ? "ti-ET" : lang,
            name: voiceFor(config, lang),
          },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { audioContent?: string };
      if (!payload.audioContent) return null;
      return { audio: Buffer.from(payload.audioContent, "base64"), mimeType: "audio/mpeg" };
    }

    if (config.provider === "gemini") {
      const language = LANG_NAMES[lang] ?? lang;
      const response = await fetch(
        `${config.baseUrl}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Read the following ${language} text aloud exactly as written, with natural pacing. Return only the speech.\n\n${clean}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice } },
              },
            },
          }),
          signal,
        }
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[];
      };
      const part = payload.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) return null;
      return {
        audio: Buffer.from(part.inlineData.data, "base64"),
        mimeType: part.inlineData.mimeType || "audio/wav",
      };
    }
  } catch {
    return null;
  }

  return null;
}
