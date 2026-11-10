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
      <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-subtle">
        No conversation yet. Ask a question about the document.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-brand text-inverse rounded-tr-none"
                : "bg-surface-muted text-text rounded-tl-none"
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}
