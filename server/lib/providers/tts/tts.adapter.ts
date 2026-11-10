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
 *
 * Without a key the adapter returns null and the caller falls back to the
 * browser. Nothing here is required for the app to work.
 */

export type TTSProviderName = "openai" | "elevenlabs" | "google" | "none";

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
  const key = process.env.TTS_PROVIDER_KEY || "";
  const selected: TTSProviderName = provider && provider !== "none" ? provider : key ? "openai" : "none";
  const defaults = DEFAULTS[selected] ?? DEFAULTS.openai;
  return {
    provider: selected,
    apiKey: key,
    baseUrl: (process.env.TTS_BASE_URL || defaults.baseUrl).replace(/\/+$/, ""),
    model: process.env.TTS_MODEL || defaults.model,
    voice: process.env.TTS_VOICE_ID || defaults.voice,
  };
}

export function ttsAvailable(): boolean {
  const config = ttsConfig();
  return config.provider !== "none" && Boolean(config.apiKey);
}

function voiceFor(config: TTSConfig, lang: string): string {
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
export async function synthesizeSpeech(text: string, lang: string): Promise<Buffer | null> {
  const config = ttsConfig();
  if (!config.apiKey || config.provider === "none" || !text.trim()) return null;

  const clean = text.slice(0, 4000);

  try {
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
      });
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
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
      return Buffer.from(await response.arrayBuffer());
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
      return Buffer.from(payload.audioContent, "base64");
    }
  } catch {
    return null;
  }

  return null;
}
