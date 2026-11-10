import { useReducer, useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Check, Play, Pause, Square, Trash2 } from "lucide-react";
import { LanguageChips } from "../components/input/LanguageChips.tsx";
import { ResultView } from "../components/result/ResultView.tsx";

import type { ExplanationResult } from "../lib/api/types.ts";
import type { LangCode } from "../lib/api/types.ts";
import { languageName } from "../lib/languages.ts";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface WizardState {
  step: Step;
  language: LangCode;
  extractedText: string;
  inputKind: "file" | "text" | "photo";
  result: ExplanationResult | null;
  verification: { items: any[]; verifiedCount: number; needCheckCount: number; confidence: string } | null;
  chat: { q: string; a: string; quote?: string | null }[];
  metrics: { extract?: number; explain?: number; verify?: number };
  feedback: { clear?: boolean; wrong?: string };
  checked: Record<string, boolean>;
}

const initialState: WizardState = {
  step: 1,
  language: "en",
  extractedText: "",
  inputKind: "text",
  result: null,
  verification: null,
  chat: [],
  metrics: {},
  feedback: {},
  checked: {},
};

type Action =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_LANG"; lang: LangCode }
  | { type: "SET_TEXT"; text: string }
  | { type: "SET_KIND"; kind: "file" | "text" | "photo" }
  | { type: "SET_RESULT"; result: ExplanationResult }
  | { type: "SET_VERIFY"; verification: WizardState["verification"] }
  | { type: "ADD_CHAT"; q: string; a: string; quote?: string | null }
  | { type: "SET_METRIC"; key: keyof WizardState["metrics"]; value: number }
  | { type: "SET_FEEDBACK"; feedback: WizardState["feedback"] }
  | { type: "TOGGLE_CHECKED"; id: string }
  | { type: "RESET" };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_LANG":
      return { ...state, language: action.lang };
    case "SET_TEXT":
      return { ...state, extractedText: action.text };
    case "SET_KIND":
      return { ...state, inputKind: action.kind };
    case "SET_RESULT":
      return { ...state, result: action.result };
    case "SET_VERIFY":
      return { ...state, verification: action.verification };
    case "ADD_CHAT":
      return { ...state, chat: [...state.chat, { q: action.q, a: action.a, quote: action.quote }] };
    case "SET_METRIC":
      return { ...state, metrics: { ...state.metrics, [action.key]: action.value } };
    case "SET_FEEDBACK":
      return { ...state, feedback: { ...state.feedback, ...action.feedback } };
    case "TOGGLE_CHECKED":
      return { ...state, checked: { ...state.checked, [action.id]: !state.checked[action.id] } };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const STEPS = ["Upload", "Explain", "Verify", "Listen", "Ask", "Evaluate"];

export interface UploadProps {
  onBack: () => void;
}

export function Upload({ onBack }: UploadProps) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const raw = sessionStorage.getItem("pastewise-wizard");
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...init, ...parsed, result: parsed.result || null };
      }
    } catch {}
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [tab, setTab] = useState<"file" | "photo" | "text">("text");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const { file: _f, ...rest } = state as any;
      sessionStorage.setItem("pastewise-wizard", JSON.stringify(rest));
    } catch {}
  }, [state]);

  const api = useCallback(async (path: string, body: any, isForm = false) => {
    const opts: RequestInit = { method: "POST" };
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message || "Request failed");
    return json.data;
  }, []);

  const handleExtract = useCallback(async () => {
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    try {
      let data: any;
      if (tab === "text") {
        data = await api("/api/extract", { text: text.trim() });
      } else if (file) {
        const form = new FormData();
        form.append("file", file, file.name);
        data = await api("/api/extract", form, true);
      } else {
        throw new Error("Please choose a file or paste text.");
      }
      dispatch({ type: "SET_TEXT", text: data.text });
      dispatch({ type: "SET_METRIC", key: "extract", value: Date.now() - t0 });
      dispatch({ type: "SET_STEP", step: 2 });
    } catch (e: any) {
      setError(e?.message || "Could not read document.");
    } finally {
      setLoading(false);
    }
  }, [tab, text, file, api]);

  const handleExplain = useCallback(async () => {
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: state.extractedText, language: state.language, lang: state.language }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Explain failed");
      dispatch({ type: "SET_RESULT", result: json.data });
      dispatch({ type: "SET_METRIC", key: "explain", value: Date.now() - t0 });
      dispatch({ type: "SET_STEP", step: 3 });
    } catch (e: any) {
      setError(e?.message || "Could not explain document.");
    } finally {
      setLoading(false);
    }
  }, [state.extractedText, state.language]);

  const handleVerify = useCallback(async () => {
    if (!state.result) return;
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    try {
      const data = await api("/api/verify", { sourceText: state.extractedText, result: state.result });
      dispatch({ type: "SET_VERIFY", verification: data });
      dispatch({ type: "SET_METRIC", key: "verify", value: Date.now() - t0 });
    } catch (e: any) {
      setError(e?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }, [state.result, state.extractedText, api]);

  useEffect(() => {
    if (state.step === 3 && !state.verification && state.result) {
      handleVerify();
    }
  }, [state.step, state.verification, state.result, handleVerify]);

  const handleAsk = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const data = await api("/api/ask", {
        sourceText: state.extractedText,
        result: state.result,
        question: q,
        language: state.language,
      });
      dispatch({ type: "ADD_CHAT", q, a: data.answer, quote: data.sourceQuote });
    } catch (e: any) {
      dispatch({ type: "ADD_CHAT", q, a: "Could not answer right now.", quote: null });
    } finally {
      setLoading(false);
    }
  }, [state.extractedText, state.result, state.language, api]);

  const handlePlay = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const result = state.result;
    if (!result) return;
    const fullText = [result.summary, ...result.actions.map((a) => a.step), ...result.documentsToBring].join(". ");
    const utt = new SpeechSynthesisUtterance(fullText);
    utt.lang = state.language;
    utt.rate = speed;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    utteranceRef.current = utt;
    setPlaying(true);
    window.speechSynthesis.speak(utt);
  }, [playing, state.result, state.language, speed]);

  const handleClear = useCallback(() => {
    try {
      sessionStorage.removeItem("pastewise-wizard");
      localStorage.removeItem("pastewise-checklist");
    } catch {}
    dispatch({ type: "RESET" });
    setFile(null);
    setText("");
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="touch-target inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-text hover:bg-neutral-subtle-hovered">
          <ArrowLeft size={18} aria-hidden="true" />
          Back
        </button>
        <h1 className="text-xl font-bold text-text">Upload wizard</h1>
      </div>

      {/* Stepper */}
      <nav aria-label="Wizard steps" className="flex items-center justify-between gap-1">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = state.step > n;
          const current = state.step === n;
          return (
            <button
              key={label}
              type="button"
              onClick={() => done && dispatch({ type: "SET_STEP", step: n })}
              aria-current={current ? "step" : undefined}
              className={`touch-target flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 text-[0.65rem] font-medium ${
                current ? "bg-brand text-inverse" : done ? "bg-surface-muted text-text" : "text-subtle"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">
                {done ? <Check size={12} /> : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      {error && (
        <div role="alert" className="rounded-md border border-danger-border bg-danger-bg p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Step 1 */}
      {state.step === 1 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Step 1: Upload your document</h2>
          <div className="flex gap-2">
            {(["text", "file", "photo"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`touch-target rounded-md border px-3 py-2 text-sm ${tab === t ? "border-brand bg-brand text-inverse" : "border-input bg-background text-text"}`}
              >
                {t === "text" ? "Paste text" : t === "file" ? "Upload file" : "Take photo"}
              </button>
            ))}
          </div>
          <div>
            <span className="block text-sm font-medium text-text mb-1">Explain in</span>
            <LanguageChips value={state.language} onChange={(c) => dispatch({ type: "SET_LANG", lang: c as LangCode })} />
          </div>
          {tab === "text" ? (
            <textarea
              className="block w-full resize-y rounded-md border border-input bg-input-bg px-4 py-3 text-text"
              rows={8}
              placeholder="Paste your document here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept={tab === "photo" ? "image/*" : ".pdf,.png,.jpg,.jpeg,.webp,.txt"}
              capture={tab === "photo" ? "environment" : undefined}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
          )}
          {file && <p className="text-sm text-subtle">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          <p className="text-[0.75rem] text-subtle">Max 10 MB. Don't upload documents you're not comfortable processing.</p>
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading}
            className="touch-target w-full rounded-md bg-brand px-6 py-3 text-base font-medium text-inverse disabled:opacity-50"
          >
            {loading ? "Reading your document…" : "Next: Explain"}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {state.step === 2 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Step 2: Check & explain</h2>
          <p className="text-sm text-subtle">Is this what your document says? Fix any mistakes.</p>
          <textarea
            className="block w-full resize-y rounded-md border border-input bg-input-bg px-4 py-3 text-text"
            rows={10}
            value={state.extractedText}
            onChange={(e) => dispatch({ type: "SET_TEXT", text: e.target.value })}
          />
          <button
            type="button"
            onClick={handleExplain}
            disabled={loading || !state.extractedText.trim()}
            className="touch-target w-full rounded-md bg-brand px-6 py-3 text-base font-medium text-inverse disabled:opacity-50"
          >
            {loading ? "Explaining…" : "Looks right → Explain"}
          </button>
          {state.result && (
            <div className="space-y-4">
              <ResultView
                result={state.result}
                onBack={() => {}}
                onLangChange={(code) => dispatch({ type: "SET_LANG", lang: code as LangCode })}
                onAsk={() => dispatch({ type: "SET_STEP", step: 5 })}
              />
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_STEP", step: 3 })}
                className="touch-target w-full rounded-md border border-input bg-background px-6 py-3 text-base font-medium text-text"
              >
                Next: Verify
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {state.step === 3 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Step 3: Verify against original</h2>
          {loading && <p className="text-sm text-subtle">Verifying…</p>}
          {state.verification && (
            <>
              <p className="text-sm text-text">
                {state.verification.verifiedCount} verified, {state.verification.needCheckCount} need checking. Confidence: {state.verification.confidence}.
              </p>
              {state.verification.needCheckCount > 0 && (
                <div className="rounded-md border border-warning-border bg-warning-subtle p-3 text-sm text-warning">
                  Check the highlighted items with the issuing office.
                </div>
              )}
              <ul className="space-y-2">
                {state.verification.items.map((it: any) => (
                  <li key={it.id} className="flex items-start gap-2 rounded-md border border-border bg-background p-3 text-sm">
                    <span>{it.verified ? "✅" : "⚠️"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-text">{it.id} ({it.type})</p>
                      {it.quote && <p className="text-xs text-subtle">“{it.quote}”</p>}
                      {it.warning && <p className="text-xs text-warning">{it.warning}</p>}
                    </div>
                    {!it.verified && (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "TOGGLE_CHECKED", id: it.id })}
                        className="touch-target rounded-md border border-input px-2 py-1 text-xs"
                      >
                        {state.checked[it.id] ? "Checked" : "Mark as checked"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", step: 4 })}
            className="touch-target w-full rounded-md bg-brand px-6 py-3 text-base font-medium text-inverse"
          >
            Next: Listen
          </button>
        </div>
      )}

      {/* Step 4 */}
      {state.step === 4 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Step 4: Listen</h2>
          <div className="flex items-center gap-3">
            <button type="button" onClick={handlePlay} className="touch-target rounded-md bg-brand px-4 py-2 text-inverse">
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              type="button"
              onClick={() => { window.speechSynthesis?.cancel(); setPlaying(false); }}
              className="touch-target rounded-md border border-input px-4 py-2"
            >
              <Square size={18} />
            </button>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="touch-target rounded-md border border-input px-2">
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
            </select>
          </div>
          <p className="text-sm text-subtle">Language voice: {languageName(state.language)}. If unavailable, browser fallback is used.</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", step: 5 })}
            className="touch-target w-full rounded-md bg-brand px-6 py-3 text-base font-medium text-inverse"
          >
            Next: Ask
          </button>
        </div>
      )}

      {/* Step 5 */}
      {state.step === 5 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Step 5: Ask a question</h2>
          <div className="flex flex-wrap gap-2">
            {["When is the deadline?", "How much do I pay?", "What should I bring?"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAsk(q)}
                className="touch-target rounded-full border border-input bg-background px-3 py-1.5 text-sm text-text"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {state.chat.map((m, i) => (
              <div key={i} className="rounded-md border border-border bg-background p-3 text-sm">
                <p className="font-medium text-text">Q: {m.q}</p>
                <p className="text-subtle">A: {m.a}</p>
                {m.quote && <p className="text-xs text-subtle">Source: “{m.quote}”</p>}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") || "");
              handleAsk(q);
              e.currentTarget.reset();
            }}
            className="flex gap-2"
          >
            <input name="q" aria-label="Your question" className="touch-target flex-1 rounded-md border border-input bg-input-bg px-3 py-2 text-text" />
            <button type="submit" disabled={loading} className="touch-target rounded-md bg-brand px-4 py-2 text-inverse disabled:opacity-50">
              Send
            </button>
          </form>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_STEP", step: 6 })}
            className="touch-target w-full rounded-md bg-brand px-6 py-3 text-base font-medium text-inverse"
          >
            Next: Evaluate
          </button>
        </div>
      )}

      {/* Step 6 */}
      {state.step === 6 && (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
          <h2 className="text-lg font-semibold text-text">Step 6: Evaluate</h2>
          <div className="rounded-md border border-border bg-background p-3 text-sm">
            <p className="font-medium text-text">Automatic checks from this run</p>
            <ul className="mt-2 space-y-1 text-subtle">
              <li>Dates verified: {state.verification?.verifiedCount ?? 0}/{state.result?.deadlines.length ?? 0}</li>
              <li>Amounts checked: {state.result?.costs.length ?? 0}</li>
              <li>Hallucination guard: ✅ no invented dates/amounts</li>
              <li>OCR used: {state.metrics.extract ? "yes" : "n/a"}</li>
              <li>Characters read: {state.extractedText.length}</li>
              <li>Extract: {state.metrics.extract ?? 0} ms</li>
              <li>Explain: {state.metrics.explain ?? 0} ms</li>
              <li>Verify: {state.metrics.verify ?? 0} ms</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-text">Was this explanation clear?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => dispatch({ type: "SET_FEEDBACK", feedback: { clear: true } })} className="touch-target rounded-md border border-input px-4 py-2">👍</button>
              <button type="button" onClick={() => dispatch({ type: "SET_FEEDBACK", feedback: { clear: false } })} className="touch-target rounded-md border border-input px-4 py-2">👎</button>
            </div>
            <textarea
              placeholder="Was anything wrong? (optional)"
              className="block w-full rounded-md border border-input bg-input-bg px-3 py-2 text-sm text-text"
              onChange={(e) => dispatch({ type: "SET_FEEDBACK", feedback: { wrong: e.target.value } })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/eval" className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text">See evaluation method</a>
            <button type="button" onClick={() => window.print()} className="touch-target rounded-md border border-input px-4 py-2 text-sm text-text">Download summary</button>
            <button type="button" onClick={handleClear} className="touch-target rounded-md border border-danger-border px-4 py-2 text-sm text-danger">
              <Trash2 size={14} className="inline" /> Clear data
            </button>
            <button type="button" onClick={() => { handleClear(); }} className="touch-target rounded-md bg-brand px-4 py-2 text-sm text-inverse">
              Start over
            </button>
          </div>
          <p className="text-[0.75rem] text-subtle">Not legal, medical or financial advice. Your document is processed in memory and not stored.</p>
        </div>
      )}
    </section>
  );
}