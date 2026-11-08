export interface StatusBadgeProps {
  status: "verified" | "unverified" | "partial" | "relative" | "ambiguous";
  label?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  verified: { color: "text-success", bg: "bg-success/10", border: "border-success/20" },
  unverified: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  partial: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  relative: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
  ambiguous: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
};

const STATUS_TEXT: Record<string, string> = {
  verified: "Verified in source",
  unverified: "Check the original",
  partial: "Partly verified",
  relative: "Depends on another date",
  ambiguous: "Unclear in original",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const text = label || STATUS_TEXT[status];
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${config.border} ${config.bg} ${config.color}`}>
      {text}
    </span>
  );
}
