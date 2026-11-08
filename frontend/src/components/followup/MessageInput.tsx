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
        disabled={disabled}
        className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="touch-target rounded-lg bg-accent px-4 py-2.5 text-accent-foreground text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
      >
        Send
      </button>
    </div>
  );
}
