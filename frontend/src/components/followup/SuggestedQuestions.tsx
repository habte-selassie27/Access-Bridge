export interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex gap-2 mb-4">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="touch-target rounded-full border border-border bg-background px-3 py-1.5 text-xs bg-background hover:bg-surface-muted text-sm"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
