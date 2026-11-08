import { useState, useCallback } from "react";
import { MessageCircle, AlertCircle } from "lucide-react";
import { SuggestedQuestions } from "./SuggestedQuestions.tsx";
import { MessageList } from "./MessageList.tsx";
import { MessageInput } from "./MessageInput.tsx";
import { followupQuestion } from "../../lib/api/followup.ts";

const DEFAULT_QUESTIONS = [
  "What happens if I miss the deadline?",
  "Where do I need to go?",
  "Explain this in simpler words.",
];

// Used only when the follow-up service cannot be reached, so demo mode still answers.
function localAnswer(question: string): string {
  const lower = question.toLowerCase();
  if (lower.includes("deadline")) {
    return "The document does not explain what happens if you miss the deadline. Please contact the issuing office to confirm.";
  }
  if (lower.includes("where") || lower.includes("go")) {
    return "Go to the office or location named in the document. Bring the documents listed under 'Documents to bring'.";
  }
  if (lower.includes("simpler") || lower.includes("12")) {
    return "This paper tells you something important you need to do. Read the checklist and follow the steps before the deadline.";
  }
  return "The document does not explain this. Please contact the issuing office for more information.";
}

export interface FollowUpSheetProps {
  open: boolean;
  onClose: () => void;
  docContext: string;
  lang: string;
}

export function FollowUpSheet({ open, onClose, docContext, lang }: FollowUpSheetProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(
    async (override?: string) => {
      const q = (override ?? input).trim();
      if (!q || sending) return;
      setError(null);
      const history = messages;
      setMessages((prev) => [...prev, { role: "user", content: q }]);
      setInput("");
      setSending(true);

      const offline = () => {
        setMessages((prev) => [...prev, { role: "assistant", content: localAnswer(q) }]);
        setError("Live answers are unavailable right now, so this is a limited offline answer.");
      };

      try {
        const { data, warning, error: apiError } = await followupQuestion({
          docContext,
          history,
          question: q,
          lang,
        });
        if (apiError || !data?.answer) {
          offline();
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
        // The server tells us when it substituted a fallback; never present that as a live answer.
        if (warning) setError(warning);
      } catch {
        offline();
      } finally {
        setSending(false);
      }
    },
    [input, sending, messages, docContext, lang]
  );

  if (!open) return null;

  return (
    <section
      className="fixed inset-0 z-50 flex flex-col"
      aria-modal="true"
      role="dialog"
      aria-label="Follow-up questions"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex-1 flex flex-col max-h-[85vh] w-full border-t border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <MessageCircle size={20} strokeWidth={2} />
            Ask a question
          </h2>
          <button type="button" onClick={onClose} className="touch-target rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-surface-muted" aria-label="Close">
            <span className="sr-only">Close</span>
            <span className="block w-5 h-5" dangerouslySetInnerHTML={{ __html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' }} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <SuggestedQuestions questions={DEFAULT_QUESTIONS} onSelect={(q) => handleSend(q)} />
          <MessageList messages={messages} />
          {sending && (
            <p className="text-xs text-text-secondary">Checking the document…</p>
          )}
          {error && (
            <div className="flex items-start rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning text-sm">
              <AlertCircle size={16} strokeWidth={2} className="mr-2 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border bg-background">
          <MessageInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            disabled={sending}
          />
        </div>
      </div>
    </section>
  );
}
