import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  /** Language code used to recognise speech, e.g. "am" or "en". */
  lang?: string;
}

/**
 * Ask by voice or text.
 *
 * Uses the browser's Web Speech API where it exists (Chrome, Edge, Safari) and
 * simply hides the mic button where it does not — the text field always works.
 */
export function MessageInput({ value, onChange, onSend, disabled, lang = "en" }: MessageInputProps) {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!supported) {
      setVoiceError("Voice input is not supported in this browser. Type your question instead.");
      return;
    }
    setVoiceError(null);
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) onChange(transcript.trim());
      stopListening();
    };
    rec.onerror = (event: any) => {
      setVoiceError(
        event?.error === "not-allowed"
          ? "Microphone access was blocked. Type your question instead."
          : "Could not hear that. Try again, or type your question."
      );
      stopListening();
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setVoiceError("Could not start voice input. Type your question instead.");
    }
  }, [supported, lang, onChange, stopListening]);

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Ask a question about this document…"
          aria-label="Your question"
          disabled={disabled}
          className="flex-1 rounded-md border border-input bg-background px-4 py-2.5 text-sm text-text focus-visible:border-focused focus-visible:ring-0 disabled:opacity-50"
        />
        {supported && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={disabled}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : "Ask by voice"}
            title={listening ? "Stop listening" : "Ask by voice"}
            className={`touch-target rounded-md border border-input bg-background px-3 py-2.5 text-sm transition-colors disabled:opacity-50 ${
              listening ? "border-brand bg-brand text-inverse" : "text-text"
            }`}
          >
            {listening ? <Square size={16} strokeWidth={2.5} aria-hidden="true" /> : <Mic size={16} strokeWidth={2} aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="touch-target rounded-md bg-brand px-4 py-2.5 text-inverse text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
        >
          Send
        </button>
      </div>
      {voiceError && (
        <p role="alert" className="text-[0.75rem] text-warning">
          {voiceError}
        </p>
      )}
    </div>
  );
}
