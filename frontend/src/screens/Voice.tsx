import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Volume2, Mic, Languages } from "lucide-react";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout.tsx";
import { DocumentPicker } from "../components/library/DocumentPicker.tsx";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { listDocs } from "../lib/library.ts";
import type { LibraryDoc } from "../lib/library.ts";
import type { LangCode } from "../lib/api/types.ts";
import { isRtl, languageName } from "../lib/languages.ts";
import { translateForVoiceStudio } from "../lib/api/voice.ts";

const SPEEDS = [0.7, 0.85, 1, 1.15, 1.3];
const API_BASE = import.meta.env.VITE_API_BASE || "";

export interface VoiceProps {
  lang: LangCode;
  activeDoc: LibraryDoc | null;
}

type PlaybackStatus = "idle" | "playing" | "paused";
type TranslateStatus = "idle" | "loading" | "ready" | "error";

export function Voice({ lang, activeDoc }: VoiceProps) {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [docId, setDocId] = useState(activeDoc?.id ?? "");
  const [speed, setSpeed] = useState(1);
  const [status, setStatus] = useState<PlaybackStatus>("idle");
  const [voiceLang, setVoiceLang] = useState<LangCode>(lang);
  const [mode, setMode] = useState<"summary" | "full">("full");
  const [transcript, setTranscript] = useState("");

  const [translation, setTranslation] = useState("");
  const [translateStatus, setTranslateStatus] = useState<TranslateStatus>("idle");
  const [translateError, setTranslateError] = useState("");
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    setDocs(listDocs());
  }, []);

  useEffect(() => {
    if (activeDoc?.id) setDocId(activeDoc.id);
  }, [activeDoc?.id]);

  const doc = docs.find((d) => d.id === docId) ?? activeDoc ?? null;
  const docLang: LangCode = doc?.lang ?? "en";
  const fullText = doc?.fullText ?? doc?.sourceText ?? "";

  const summaryText = doc
    ? [
        doc.result.summary,
        ...doc.result.actions.map((a) => a.step),
        ...doc.result.documentsToBring.length
          ? ["Documents to bring: " + doc.result.documentsToBring.join(", ")]
          : [],
        ...doc.result.deadlines.length
          ? ["Deadlines: " + doc.result.deadlines.map((d) => `${d.label} ${d.originalValue ?? ""}`).join(", ")]
          : [],
        ...doc.result.costs.length
          ? ["Costs: " + doc.result.costs.map((c) => `${c.label} ${c.originalValue}`).join(", ")]
          : [],
      ].join(". ")
    : "";

  const sourceText = mode === "summary" ? summaryText : fullText;
  const needsTranslation = Boolean(doc) && voiceLang !== docLang;
  const spokenText = needsTranslation ? translation : sourceText;
  const canPlay =
    spokenText.trim().length > 0 && (!needsTranslation || translateStatus === "ready");

  /** Stop both the server audio and the device voice. */
  function stopPlayback() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    utteranceRef.current = null;
    setStatus("idle");
  }

  // Translate whenever the selected language or the source text changes, so
  // the page shows the text that will actually be spoken.
  useEffect(() => {
    if (!needsTranslation) {
      setTranslation("");
      setTranslateStatus("idle");
      setTranslateError("");
      return;
    }
    if (!sourceText.trim()) {
      setTranslation("");
      setTranslateStatus("error");
      setTranslateError("There is no text to translate for this document.");
      return;
    }

    const requestId = ++requestRef.current;
    setTranslateStatus("loading");
    setTranslateError("");

    translateForVoiceStudio({ text: sourceText, lang: docLang, targetLang: voiceLang })
      .then((res) => {
        if (requestId !== requestRef.current) return;
        if (res.error || !res.data?.translated) {
          setTranslateStatus("error");
          setTranslation("");
          setTranslateError(
            res.error?.message ||
              `We could not translate this document into ${languageName(voiceLang)}.`
          );
          return;
        }
        setTranslation(res.data.translated);
        setTranslateStatus("ready");
      })
      .catch(() => {
        if (requestId !== requestRef.current) return;
        setTranslateStatus("error");
        setTranslation("");
        setTranslateError(
          `We could not reach the translator for ${languageName(voiceLang)}. Check your connection.`
        );
      });
  }, [needsTranslation, sourceText, docLang, voiceLang]);

  // Switching language stops whatever is playing.
  useEffect(() => {
    stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceLang, docId, mode]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) audioRef.current.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  /** Try the server voice first, then the device voice for the same language. */
  async function speak(textToSpeak: string) {
    if (!textToSpeak.trim()) return;

    stopPlayback();
    setVoiceNotice(null);
    setStatus("playing");

    try {
      const response = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, lang: voiceLang }),
      });
      const type = response.headers.get("content-type") || "";
      if (response.ok && type.includes("audio")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        const audio = new Audio(url);
        audio.playbackRate = speed;
        audioRef.current = audio;
        audio.onended = () => setStatus("idle");
        audio.onerror = () => {
          setStatus("idle");
          setVoiceNotice("The server voice could not be played. Trying your device voice.");
        };
        await audio.play();
        return;
      }
    } catch {
      // Fall through to the device voice.
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setStatus("idle");
      setVoiceNotice("This browser cannot read text aloud. Try Chrome, Edge or Safari.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voiceLang;
    utterance.rate = speed;
    const voices = window.speechSynthesis.getVoices();
    const wanted = voiceLang.toLowerCase();
    const name = languageName(voiceLang).toLowerCase();
    const match = voices.find(
      (voice) =>
        voice.lang.toLowerCase().startsWith(wanted) || voice.name.toLowerCase().includes(name)
    );
    if (!match) {
      // Never let the browser read Amharic, Oromo or Tigrinya with an English
      // voice: the words would be wrong even though audio plays.
      setStatus("idle");
      setVoiceNotice(
        `No ${languageName(voiceLang)} voice is installed on this device, so nothing was played. The transcript is translated. Install a ${languageName(voiceLang)} voice in your system settings, or run the server voice.`
      );
      return;
    }
    utterance.voice = match;
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => {
      setStatus("idle");
      setVoiceNotice(`Could not speak ${languageName(voiceLang)} on this device.`);
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function handlePlay() {
    if (status === "playing") {
      if (audioRef.current) audioRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
      setStatus("paused");
      return;
    }
    if (status === "paused") {
      if (audioRef.current) {
        void audioRef.current.play();
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
      setStatus("playing");
      return;
    }
    void speak(spokenText);
  }

  function handleReadTranscript() {
    if (!transcript.trim()) return;
    void speak(transcript);
  }

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
          <LanguageChips
            value={voiceLang}
            onChange={(code) => {
              setVoiceLang(code);
              setVoiceNotice(null);
            }}
          />
        </div>

        {!doc ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-subtle">
            <Volume2 size={16} className="mb-1 inline" aria-hidden="true" />
            Choose a saved document to hear it read out.
          </p>
        ) : (
          <>
            {needsTranslation && (
              <section
                aria-live="polite"
                className="rounded-lg border border-border bg-surface-muted p-3 text-sm"
              >
                {translateStatus === "loading" && (
                  <p className="flex items-center gap-2 text-text">
                    <Languages size={16} aria-hidden="true" />
                    Translating this document into {languageName(voiceLang)}…
                  </p>
                )}
                {translateStatus === "ready" && (
                  <p className="flex items-center gap-2 text-text">
                    <Languages size={16} aria-hidden="true" />
                    Translated into {languageName(voiceLang)}. The transcript below is what
                    you will hear.
                  </p>
                )}
                {translateStatus === "error" && (
                  <p role="alert" className="text-danger">
                    <Languages size={16} className="mb-1 inline" aria-hidden="true" />{" "}
                    {translateError}
                  </p>
                )}
              </section>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePlay}
                disabled={!canPlay}
                className="touch-target inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-medium text-inverse disabled:opacity-60"
              >
                {status === "playing" ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {status === "playing" ? "Pause" : status === "paused" ? "Resume" : "Play"}
              </button>
              <button
                type="button"
                onClick={stopPlayback}
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
                    stopPlayback();
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

            {voiceNotice && (
              <p
                role="status"
                className="rounded-lg border border-warning-border bg-warning-subtle p-3 text-sm text-warning"
              >
                {voiceNotice}
              </p>
            )}

            <section
              className="rounded-lg border border-border bg-surface p-4"
              lang={voiceLang}
              dir={isRtl(voiceLang) ? "rtl" : "ltr"}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-text">
                  {needsTranslation ? "Translated transcript" : "Transcript"}
                </h2>
                <span className="text-[0.75rem] text-subtle">
                  {languageName(voiceLang)} ·{" "}
                  {mode === "summary" ? "short version" : "full document"}
                </span>
              </div>
              {needsTranslation ? (
                translateStatus === "ready" ? (
                  <p className="whitespace-pre-wrap text-sm text-text">{translation}</p>
                ) : translateStatus === "loading" ? (
                  <p className="text-sm text-subtle">Translating…</p>
                ) : (
                  <p className="text-sm text-subtle">
                    Translation unavailable. The original text is not shown as {languageName(voiceLang)}.
                  </p>
                )
              ) : (
                <p className="whitespace-pre-wrap text-sm text-text">{sourceText}</p>
              )}
            </section>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMode("summary")}
                className={`touch-target rounded-md px-4 py-2 text-sm ${
                  mode === "summary"
                    ? "border-brand bg-brand text-inverse"
                    : "border-input bg-background text-text"
                }`}
              >
                Read the short version
              </button>
              <button
                type="button"
                onClick={() => setMode("full")}
                className={`touch-target rounded-md px-4 py-2 text-sm ${
                  mode === "full"
                    ? "border-brand bg-brand text-inverse"
                    : "border-input bg-background text-text"
                }`}
              >
                Read the full document
              </button>
            </div>

            <p className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-[0.8rem] text-subtle">
              <Mic size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              To ask a question by voice, open the Assistant and use the microphone button next
              to the message box.
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
            onClick={handleReadTranscript}
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
