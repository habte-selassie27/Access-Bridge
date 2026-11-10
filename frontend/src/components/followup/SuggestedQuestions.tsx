export interface SuggestedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="touch-target rounded-full border border-input bg-background px-3 py-1.5 text-sm text-text transition-colors hover:bg-neutral-subtle-hovered"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
