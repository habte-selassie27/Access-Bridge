export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeDirection?: "up" | "down";
}

export function MetricCard({ label, value, change, changeDirection }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${
            changeDirection === "up" ? "text-success" : "text-warning"
          }`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
