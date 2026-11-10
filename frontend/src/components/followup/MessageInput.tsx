export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export function MessageInput({ value, onChange, onSend, disabled }: MessageInputProps) {
  return (
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
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="touch-target rounded-md bg-brand px-4 py-2.5 text-inverse text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
      >
        Send
      </button>
    </div>
  );
}
