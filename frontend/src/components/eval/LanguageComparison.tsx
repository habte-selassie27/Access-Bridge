import type { EvalResults } from "./evalTypes.ts";

const LABELS: Record<string, string> = { am: "Amharic", om: "Oromo", ti: "Tigrinya", en: "English" };

function pct(n: number | null | undefined): string {
  return typeof n === "number" ? `${Math.round(n * 100)}%` : "—";
}

function measured(nMeasured: number | undefined, n: number | undefined): string {
  return typeof nMeasured === "number" && typeof n === "number" ? `${nMeasured}/${n}` : "—";
}

export function LanguageComparison({ data }: { data: EvalResults | null }) {
  const langs = ["am", "om", "ti"].filter((l) => data?.languages[l]);

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      {langs.length ? (
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-surface-muted">
              <th className="pb-2 text-subtle font-medium">Language</th>
              <th className="pb-2 text-subtle font-medium">Baseline date accuracy</th>
              <th className="pb-2 text-subtle font-medium">Adapted date accuracy</th>
              <th className="pb-2 text-subtle font-medium">Scored rows (base / adapted)</th>
              <th className="pb-2 text-subtle font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {langs.map((lang) => {
              const entry = data!.languages[lang];
              const delta = entry.delta.dateAccuracy;
              return (
                <tr key={lang} className="border-b border-surface-muted/50">
                  <td className="py-3 text-text">{LABELS[lang] ?? lang}</td>
                  <td className="py-3 text-subtle">{pct(entry.baseline.dateAccuracy)}</td>
                  <td className="py-3 text-text">{pct(entry.adapted.dateAccuracy)}</td>
                  <td className="py-3 text-subtle">
                    {measured(entry.baseline.nMeasured, entry.baseline.n)} /{" "}
                    {measured(entry.adapted.nMeasured, entry.adapted.n)}
                  </td>
                  <td className={`py-3 ${typeof delta === "number" && delta >= 0 ? "text-success" : "text-warning"}`}>
                    {typeof delta === "number" ? `${delta >= 0 ? "+" : ""}${Math.round(delta * 100)} pts` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-subtle">No measured language results yet.</p>
      )}
    </section>
  );
}
