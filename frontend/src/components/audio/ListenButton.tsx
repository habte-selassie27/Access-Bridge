import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { useMachine, audioReducer, initialAudioState } from "../../lib/state/index.ts";
import { demoAudioUrl } from "../../lib/demo-audio.ts";

export interface ListenButtonProps {
  text: string;
  lang: string;
  disabled?: boolean;
  /** Set for bundled demo documents so the pre-recorded readout is used. */
  demoId?: string;
}

export function ListenButton({ text, lang, disabled = false, demoId }: ListenButtonProps) {
  const [audio, send] = useMachine(audioReducer, initialAudioState);
  const playing = audio.status === "playing";
  const error = audio.error;
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // A bundled recording beats the device voice: most devices have no Amharic,
  // Oromo or Tigrinya voice installed, and the recording also works offline.
  const recordedUrl = demoAudioUrl(demoId, lang);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && ("speechSynthesis" in window || !!recordedUrl));
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current = null;
      }
      send({ type: "RESET" });
    };
  }, [send, recordedUrl]);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    send({ type: "STOPPED" });
    utteranceRef.current = null;
  }, [send]);

  const playRecording = useCallback(
    (url: string) => {
      const el = new Audio(url);
      audioElRef.current = el;
      el.onplaying = () => send({ type: "PLAYING" });
      el.onended = () => {
        audioElRef.current = null;
        send({ type: "STOPPED" });
      };
      el.onerror = () => {
        audioElRef.current = null;
        send({ type: "ERROR", message: "The recorded voice could not be played." });
      };
      void el.play().catch(() => {
        audioElRef.current = null;
        send({ type: "ERROR", message: "The recorded voice could not be played." });
      });
    },
    [send]
  );

  const handleToggle = useCallback(() => {
    if (!supported) {
      send({ type: "ERROR", message: "Voice not supported in this browser." });
      return;
    }
    if (playing) {
      stop();
      return;
    }
    send({ type: "LOADING" });
    if (typeof window === "undefined") return;

    if (recordedUrl) {
      playRecording(recordedUrl);
      return;
    }

    // Ask the server for the audio first. When a speech provider is
    // configured this works on a phone with no Amharic or Arabic voice
    // installed, which is the whole point of doing it on the server.
    void fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    })
      .then(async (response) => {
        const type = response.headers.get("content-type") || "";
        if (!type.includes("audio")) return null;
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      })
      .then((url) => {
        if (!url) return false;
        playRecording(url);
        return true;
      })
      .catch(() => false)
      .then((played) => {
        if (played) return;
        speakWithDeviceVoice();
      });
  }, [text, lang, supported, playing, stop, send, recordedUrl, playRecording]);

  /** The device's own voice, used when the server has no audio for us. */
  const speakWithDeviceVoice = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      send({ type: "ERROR", message: "Voice not supported in this browser." });
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    // Never silently use an unrelated language voice: only match the requested
    // language, otherwise tell the user that no voice is installed.
    const voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (voice) utt.voice = voice;
    else {
      send({ type: "ERROR", message: `No ${lang} voice is installed on this device.` });
      return;
    }
    utt.onstart = () => send({ type: "PLAYING" });
    utt.onend = () => send({ type: "STOPPED" });
    utt.onerror = () => {
      send({ type: "ERROR", message: "Voice unavailable for this language." });
    };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [text, lang, send]);

  if (disabled) {
    return (
      <button
        type="button"
        className="touch-target rounded-lg border border-border bg-surface-muted px-3 py-2 text-subtle cursor-not-allowed"
        aria-disabled="true"
      >
        <Volume2 size={18} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleToggle}
        className={`touch-target inline-flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-neutral-subtle-hovered ${
          playing ? "bg-brand text-inverse border-brand" : ""
        }`}
        aria-label={playing ? "Pause reading" : "Listen to this explanation"}
        aria-pressed={playing}
        title={playing ? "Pause reading" : "Listen to this explanation"}
      >
        {playing ? (
          <Pause size={18} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <Play size={18} strokeWidth={2.5} aria-hidden="true" />
        )}
        <span>{playing ? "Pause" : "Listen"}</span>
      </button>
      {error ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning-border bg-warning-subtle px-2 py-0.5 text-[0.75rem] text-warning">
          <AlertCircle size={12} strokeWidth={2} />
          {error}
        </span>
      ) : null}
    </div>
  );
}
