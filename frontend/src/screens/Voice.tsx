import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2, Mic } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { LangCode } from "../lib/api/types.ts";
import { isRtl } from "../lib/languages.ts";

const SPEEDS = [0.7, 0.85, 1, 1.15, 1.3];

export interface VoiceProps {
  lang: LangCode;
  activeDoc: LibraryDoc | null;
}

export function Voice({ lang, activeDoc }: VoiceProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState(activeDoc?.id ?? "");
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");
  const [voiceLang, setVoiceLang] = useState<LangCode>(lang);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) setDocId(activeDoc.id);
  }, [activeDoc?.id]);

  const doc = docs.find((d) => d.id === docId) ?? activeDoc ?? null;

  const text = doc
    ? [
        doc.result.summary,
        ...doc.result.actions.map((a) => a.step),
        ...doc.result.documentsToBring.length ? ["Documents to bring: " + doc.result.documentsToBring.join(", ")] : [],
        ...doc.result.deadlines.length
          ? ["Deadlines: " + doc.result.deadlines.map((d) => `${d.label} ${d.originalValue ?? ""}`).join(", ")]
          : [],
        ...doc.result.costs.length
          ? ["Costs: " + doc.result.costs.map((c) => `${c.label} ${c.originalValue}`).join(", ")]
          : [],
      ].join(". ")
    : "";

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("idle");
  }, []);

  const play = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = speed;
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setStatus("playing");
  }, [status, speed, text, voiceLang]);

  useEffect(() => () => stop(), [stop]);

  return (
    <WorkspaceLayout
      currentPath="/voice"
      title="Voice Studio"
      subtitle="Listen instead of reading. The words on screen are the words you hear."
    >
      <div className="space-y-4">
        <DocumentPicker docs={docs} value={docId} onChange={setDocId} />

        <div>
          <p className="mb-2 text-sm font-medium text-text">Voice language</p>
          <LanguageChips value={voiceLang} onChange={setVoiceLang} />
        </div>

        {!doc ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            <Volume2 size={16} className="mb-1 inline" aria-hidden="true" />
            Choose a saved document to hear it read out.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={play}
                className="touch-target inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-medium text-inverse"
              >
                {status === "playing" ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Play"}
              </button>
              <button
                type="button"
                onClick={stop}
                className="touch-target inline-flex items-center gap-2 rounded-md border border-input px-4 py-3 text-sm text-text"
              >
                <Square size={16} aria-hidden="true" /> Stop
              </button>
              <label className="flex items-center gap-2">
                <span className="form-label">Speed</span>
                <select
                  value={speed}
                  onChange={(e) => {
                    setSpeed(Number(e.target.value));
                    stop();
                  }}
                  className="touch-target rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}×
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <section className="rounded-lg border border-border bg-surface p-4" dir={isRtl(voiceLang) ? "rtl" : "ltr"}>
              <h2 className="mb-2 text-sm font-semibold text-text">Transcript</h2>
              <p className="whitespace-pre-wrap text-sm text-text">{text}</p>
            </section>

            <p className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-[0.8rem] text-subtle">
              <Mic size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              To ask a question by voice, open the Assistant and use the microphone button next to the message box.
            </p>
          </>
        )}

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text">Type what you want to hear</h2>
          <textarea
            className="textfield block min-h-[6rem] w-full resize-y"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste any passage to hear it read out in your language."
          />
          <button
            type="button"
            onClick={() => {
              stop();
              if (!transcript.trim()) return;
              const utterance = new SpeechSynthesisUtterance(transcript);
              utterance.lang = voiceLang;
              utterance.rate = speed;
              utterance.onend = () => setStatus("idle");
              utteranceRef.current = utterance;
              window.speechSynthesis?.speak(utterance);
              setStatus("playing");
            }}
            disabled={!transcript.trim()}
            className="touch-target rounded-md bg-brand px-5 py-3 text-sm font-medium text-inverse disabled:opacity-60"
          >
            Read this out
          </button>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
