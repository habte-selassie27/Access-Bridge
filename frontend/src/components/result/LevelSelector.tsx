import { SegmentedControl } from "../common/SegmentedControl.tsx";
import type { ExplainLevel } from "../../lib/api/types.ts";

export interface LevelSelectorProps {
  value: ExplainLevel;
  onChange: (level: ExplainLevel) => void;
  disabled?: boolean;
  note?: string;
}

/**
 * Plain-language level.
 *
 * Simple / Standard / Detailed change how the explanation is written, never
 * which facts it contains: the dates and amounts are re-checked against the
 * original every time the level changes.
 */
export function LevelSelector({ value, onChange, disabled, note }: LevelSelectorProps) {
  return (
    <SegmentedControl
      label="Explanation level"
      value={value}
      onChange={onChange}
      options={[
        { value: "simple", label: "Simple", hint: "Shortest sentences" },
        { value: "standard", label: "Standard", hint: "Plain language" },
        { value: "detailed", label: "Detailed", hint: "Full context" },
      ]}
      note={note}
      className={disabled ? "pointer-events-none opacity-60" : ""}
    />
  );
}
