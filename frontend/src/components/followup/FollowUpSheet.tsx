import { useCallback, useEffect } from "react";
import { MessageCircle, AlertCircle, X } from "lucide-react";
import { SuggestedQuestions } from "./SuggestedQuestions.tsx";
import { MessageList } from "./MessageList.tsx";
import { MessageInput } from "./MessageInput.tsx";
import { useMachine, followupReducer, initialFollowUpState } from "../../lib/state/index.ts";

const DEFAULT_QUESTIONS = [
  "What happens if I miss the deadline?",
  "Where do I need to go?",
  "Explain this in simpler words.",
];

export interface FollowUpSheetProps {
  open: boolean;
  onClose: () => void;
  onAnswer: (answer: string) => void;
}

export function FollowUpSheet({ open, onClose, onAnswer }: FollowUpSheetProps) {
  const [fu, send] = useMachine(followupReducer, initialFollowUpState);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleSend = useCallback(
    async (override?: string) => {
      const q = (override ?? fu.input).trim();
      if (!q) return;
      send({ type: "SEND", question: q });
      try {
        const lower = q.toLowerCase();
        let answer: string;
        if (lower.includes("deadline")) {
          answer = "The document does not explain what happens if you miss the deadline. Please contact the issuing office to confirm.";
        } else if (lower.includes("where") || lower.includes("go")) {
          answer = "Go to the office or location named in the document. Bring the documents listed under 'Documents to bring'.";
        } else if (lower.includes("simpler") || lower.includes("12")) {
          answer = "This paper tells you something important you need to do. Read the checklist and follow the steps before the deadline.";
        } else {
          answer = "The document does not explain this. Please contact the document issuer for more information.";
        }
        send({ type: "ANSWER", answer });
        onAnswer(answer);
      } catch {
        send({ type: "FAIL", error: "Unable to answer right now. Please ask the document issuer directly." });
      }
    },
    [fu.input, onAnswer, send]
  );

  if (!open) return null;

  return (
    <section
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      aria-modal="true"
      role="dialog"
      aria-label="Follow-up questions"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88svh] w-full flex-col rounded-t-2xl border border-border bg-background shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-text">
            <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />
            Ask a question
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-md text-subtle transition-colors hover:bg-neutral-subtle-hovered hover:text-text"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <SuggestedQuestions
            questions={DEFAULT_QUESTIONS}
            onSelect={(question) => {
              handleSend(question);
            }}
          />
          <MessageList messages={fu.messages} />
          {fu.error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger-border bg-danger-bg p-3 text-[0.75rem] text-danger">
              <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
              {fu.error}
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background p-3">
          <MessageInput value={fu.input} onChange={(v) => send({ type: "INPUT", value: v })} onSend={() => handleSend()} disabled={fu.status === "sending"} />
        </div>
      </div>
    </section>
  );
}
