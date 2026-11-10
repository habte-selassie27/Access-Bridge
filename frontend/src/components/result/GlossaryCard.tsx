import { BookOpenCheck } from "lucide-react";
import type { GlossaryEntry } from "../../lib/api/types.ts";

export interface GlossaryCardProps {
  entries: GlossaryEntry[];
}

/**
 * Hard words, explained.
 *
 * Every entry was checked against the document: the term has to appear in the
 * source, and the quote under it has to be findable there too. An entry that
 * cannot be traced is not shown at all.
 */
export function GlossaryCard({ entries }: GlossaryCardProps) {
  if (!entries || entries.length === 0) return null;
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text">
        <BookOpenCheck size={16} aria-hidden="true" /> Words this document uses
      </h2>
      <p className="mb-3 text-[0.8rem] text-subtle">
        Each one is explained in everyday words, and taken from your document.
      </p>
      <dl className="space-y-3">
        {entries.map((entry, i) => (
          <div key={i} className="rounded-md border border-border bg-background p-3">
            <dt className="text-sm font-semibold text-text">{entry.term}</dt>
            <dd className="text-sm text-subtle">{entry.meaning}</dd>
            {entry.quote && (
              <dd className="mt-1 border-l-2 border-border pl-2 text-[0.75rem] italic text-subtlest">
                “{entry.quote}”
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
