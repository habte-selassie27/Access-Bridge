import { ArrowUpDown } from "lucide-react";

export function UpdateApp({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mx-auto mb-4 max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <div
        className="flex items-center gap-2 rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5 text-[0.75rem] font-medium text-brand"
        role="status"
      >
        <ArrowUpDown size={14} strokeWidth={2} aria-hidden="true" />
        {message}
      </div>
    </div>
  );
}