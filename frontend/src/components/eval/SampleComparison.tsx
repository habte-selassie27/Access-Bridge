export interface SampleComparisonProps {
  onBack: () => void;
}

export function SampleComparison({ onBack }: SampleComparisonProps) {
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
        <h1 className="text-xl font-bold text-text-primary">Sample comparison</h1>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Amharic example</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
            <p className="text-xs text-danger font-medium mb-2 uppercase tracking-wider">Baseline</p>
            <p className="text-sm text-text-primary font-ethiopic">
              ይህ ነው የትምህርት ክፍያ ነው። ቀላሉ ቀላሉ አድርገዋል።
            </p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/5 p-4">
            <p className="text-xs text-success font-medium mb-2 uppercase tracking-wider">Adapted</p>
            <p className="text-sm text-text-primary font-ethiopic">
              የሁለተኛ ሴሚስትር የትምህርት ክፍያ በ2026-10-05 ይከፈላል። ጠቅላላ ክፍያው ETB 3,500 ነው።
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
