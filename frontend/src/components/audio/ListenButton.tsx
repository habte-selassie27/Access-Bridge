import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { useMachine, audioReducer, initialAudioState } from "../../lib/state/index.ts";

export interface ListenButtonProps {
  text: string;
  lang: string;
  disabled?: boolean;
}

export function ListenButton({ text, lang, disabled = false }: ListenButtonProps) {
  const [audio, send] = useMachine(audioReducer, initialAudioState);
  const playing = audio.status === "playing";
  const error = audio.error;
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      send({ type: "RESET" });
    };
  }, [send]);

  const stop = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    send({ type: "STOPPED" });
    utteranceRef.current = null;
  }, [send]);

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
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(lang)) || voices[0];
    if (voice) utt.voice = voice;
    utt.onstart = () => send({ type: "PLAYING" });
    utt.onend = () => send({ type: "STOPPED" });
    utt.onerror = () => {
      send({ type: "ERROR", message: "Voice unavailable for this language." });
    };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [text, lang, supported, playing, stop, send]);

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
