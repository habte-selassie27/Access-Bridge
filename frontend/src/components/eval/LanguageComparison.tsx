export interface LanguageComparisonProps {
  onBack: () => void;
}

export function LanguageComparison({ onBack }: LanguageComparisonProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="touch-target inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary hover:bg-surface-muted"
        >
          Back
        </button>
        <h1 className="text-xl font-bold text-text-primary">Language comparison</h1>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-surface-muted">
              <th className="pb-2 text-text-secondary font-medium">Language</th>
              <th className="pb-2 text-text-secondary font-medium">Baseline</th>
              <th className="pb-2 text-text-secondary font-medium">Adapted</th>
              <th className="pb-2 text-text-secondary font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-surface-muted/50">
              <td className="py-3 text-text-primary">English</td>
              <td className="py-3 text-text-secondary">92%</td>
              <td className="py-3 text-text-primary">96%</td>
              <td className="py-3 text-success">+4 pts</td>
            </tr>
            <tr className="border-b border-surface-muted/50">
              <td className="py-3 text-text-primary">Amharic</td>
              <td className="py-3 text-text-secondary">68%</td>
              <td className="py-3 text-text-primary">88%</td>
              <td className="py-3 text-success">+20 pts</td>
            </tr>
            <tr className="border-b border-surface-muted/50">
              <td className="py-3 text-text-primary">Oromo</td>
              <td className="py-3 text-text-secondary">62%</td>
              <td className="py-3 text-text-primary">85%</td>
              <td className="py-3 text-success">+23 pts</td>
            </tr>
            <tr>
              <td className="py-3 text-text-primary">Tigrinya</td>
              <td className="py-3 text-text-secondary">58%</td>
              <td className="py-3 text-text-primary">81%</td>
              <td className="py-3 text-success">+23 pts</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
