import { useState, useCallback, useEffect, useRef } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";
import { LANGUAGES } from "../../lib/languages.ts";

function langLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

export interface ListenButtonProps {
  text: string;
  lang: string;
  /** Pre-rendered audio (bundled demo documents). Falls back to speech synthesis. */
  audioSrc?: string | null;
  disabled?: boolean;
}

function hasVoiceFor(lang: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis
    .getVoices()
    .some((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase()));
}

export function ListenButton({ text, lang, audioSrc = null, disabled = false }: ListenButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAll = useCallback(() => {
    if (typeof window === "undefined") return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => stopAll, [stopAll]);

  // Device voices load asynchronously in Chrome; without this the first click
  // reports "no voice" on some machines.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener?.("voiceschanged", warm);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", warm);
  }, []);

  const speakWithDevice = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      setError("This browser cannot read text aloud.");
      return;
    }
    // Never read Amharic with an English voice: that is gibberish, not a readout.
    if (!hasVoiceFor(lang)) {
      setError(`No ${langLabel(lang)} voice on this device.`);
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    const voice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase()));
    if (voice) utt.voice = voice;
    utt.onstart = () => setPlaying(true);
    utt.onend = () => setPlaying(false);
    utt.onerror = () => {
      setPlaying(false);
      setError(`No ${langLabel(lang)} voice on this device.`);
    };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }, [text, lang]);

  const handleToggle = useCallback(() => {
    if (playing) {
      stopAll();
      return;
    }
    setError(null);

    if (!audioSrc) {
      speakWithDevice();
      return;
    }

    const audio = new Audio(audioSrc);
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      audioRef.current = null;
      setPlaying(false);
      setError("Recorded audio unavailable — trying this device's voice.");
      speakWithDevice();
    };
    void audio.play().catch(() => {
      audioRef.current = null;
      setPlaying(false);
      setError("Tap play again to allow audio, or use this device's voice.");
    });
  }, [audioSrc, playing, speakWithDevice, stopAll]);

  if (disabled) {
    return (
      <button
        type="button"
        className="touch-target rounded-lg border border-border bg-surface-muted px-3 py-2 text-text-secondary cursor-not-allowed"
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
        className={`touch-target rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-surface-muted ${
          playing ? "bg-accent text-accent-foreground border-accent" : ""
        }`}
        aria-label={playing ? "Pause reading" : "Listen"}
        title={playing ? "Pause reading" : "Listen"}
      >
        {playing ? (
          <Pause size={18} strokeWidth={2.5} />
        ) : (
          <Play size={18} strokeWidth={2.5} />
        )}
      </button>
      {error ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs text-warning">
          <AlertCircle size={12} strokeWidth={2} />
          {error}
        </span>
      ) : null}
    </div>
  );
}
