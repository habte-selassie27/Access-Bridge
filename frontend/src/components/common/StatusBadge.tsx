export interface StatusBadgeProps {
  status: "verified" | "unverified" | "partial" | "relative" | "ambiguous";
  label?: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  verified: { color: "text-success-bolder", bg: "bg-success-subtler", border: "border-success-border" },
  unverified: { color: "text-warning-bolder", bg: "bg-warning-subtle", border: "border-warning-border" },
  partial: { color: "text-warning-bolder", bg: "bg-warning-subtle", border: "border-warning-border" },
  relative: { color: "text-warning-bolder", bg: "bg-warning-subtle", border: "border-warning-border" },
  ambiguous: { color: "text-warning-bolder", bg: "bg-warning-subtle", border: "border-warning-border" },
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
    <span className={`shrink-0 whitespace-nowrap text-[0.75rem] font-medium px-2 py-0.5 rounded border ${config.border} ${config.bg} ${config.color}`}>
      {text}
    </span>
  );
}
