export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-text-secondary text-sm">
        No conversation yet. Ask a question about the document.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((m, i) => (
        <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${
              m.role === "user"
                ? "bg-accent text-accent-foreground rounded-tr-none"
                : "bg-surface-muted text-text-primary rounded-tl-none"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}
