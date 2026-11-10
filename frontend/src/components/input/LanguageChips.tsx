import { useCallback } from "react";
import { LANGUAGES, languageName, isEthiopic, saveLastLanguage } from "../../lib/languages.ts";
import type { LanguageCode } from "../../lib/languages.ts";

export interface LanguageChipsProps {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}

export function LanguageChips({ value, onChange }: LanguageChipsProps) {
  const handleChange = useCallback(
    (code: LanguageCode) => {
      saveLastLanguage(code);
      onChange(code);
    },
    [onChange]
  );

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="flex flex-wrap gap-2"
    >
      {LANGUAGES.map((lang) => {
        const selected = value === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => handleChange(lang.code)}
            className={`touch-target inline-flex items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? "bg-brand text-inverse border-brand"
                : "border-input bg-background text-subtle hover:bg-neutral-subtle-hovered"
            } ${isEthiopic(lang.code) ? "font-ethiopic" : ""}`}
          >
            {languageName(lang.code)}
          </button>
        );
      })}
    </div>
  );
}
