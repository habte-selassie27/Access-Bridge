import { useId } from "react";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  /** Rendered under the control, e.g. an honest limitation note. */
  note?: string;
  className?: string;
}

/**
 * A radio group that looks like a set of tabs.
 *
 * Used for the plain-language level, the theme and the text size. It is a
 * real radiogroup so a screen reader announces "2 of 3 selected" instead of
 * three unrelated buttons.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  note,
  className = "",
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div className={`space-y-2 ${className}`}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              name={name}
              title={option.hint}
              onClick={() => onChange(option.value)}
              className={`touch-target inline-flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                selected
                  ? "border-brand bg-brand text-inverse"
                  : "border-input bg-background text-subtle hover:bg-neutral-subtle-hovered"
              }`}
            >
              <span>{option.label}</span>
              {option.hint && (
                <span className={`text-[0.7rem] ${selected ? "text-inverse/80" : "text-subtlest"}`}>{option.hint}</span>
              )}
            </button>
          );
        })}
      </div>
      {note && <p className="text-[0.75rem] text-subtle">{note}</p>}
    </div>
  );
}
