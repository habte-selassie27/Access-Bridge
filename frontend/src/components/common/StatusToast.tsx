import { useState, useCallback } from "react";
import { AlertCircle, Info, WifiOff } from "lucide-react";

export interface Toast {
  id: string;
  type: "error" | "info" | "offline";
  message: string;
}

const ICONS: Record<string, React.ReactNode> = {
  error: <AlertCircle size={16} strokeWidth={2} />,
  info: <Info size={16} strokeWidth={2} />,
  offline: <WifiOff size={16} strokeWidth={2} />,
};

const COLORS: Record<string, string> = {
  error: "border-danger-border bg-danger-bg p-3 text-danger",
  info: "border-brand bg-brand p-3 text-inverse",
  offline: "border-warning-border bg-warning-bg p-3 text-warning-bolder",
};

export interface StatusToastProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function StatusToast({ toasts, onDismiss }: StatusToastProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${COLORS[t.type]}`}
          role="alert"
          aria-live="polite"
        >
          {ICONS[t.type]}
          <span className="text-text">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="touch-target rounded p-1 text-subtle hover:bg-neutral-subtle-hovered hover:text-text"
            aria-label="Dismiss"
          >
            <span className="sr-only">Dismiss</span>
            <span className="block w-4 h-4" dangerouslySetInnerHTML={{ __html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' }} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((type: Toast["type"], message: string, duration = 5000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    return id;
  }, []);
  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, add, dismiss };
}
