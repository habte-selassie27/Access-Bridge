import { useCallback } from "react";
import { LANGUAGES, languageName, isEthiopic, saveLastLanguage, languageTier } from "../../lib/languages.ts";
import type { LanguageCode } from "../../lib/languages.ts";

export interface LanguageChipsProps {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}

const TIER_HINT: Record<string, string> = {
  source: "Documents arrive in this language.",
  measured: "Measured on the evaluation page.",
  experimental: "Supported, but not yet measured. Quality varies.",
};

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
        const tier = languageTier(lang.code);
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => handleChange(lang.code)}
            title={`${lang.englishName} — ${TIER_HINT[tier]}`}
            className={`touch-target inline-flex items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? "bg-brand text-inverse border-brand"
                : "border-input bg-background text-subtle hover:bg-neutral-subtle-hovered"
            } ${isEthiopic(lang.code) ? "font-ethiopic" : ""}`}
          >
            {languageName(lang.code)}
            {tier === "experimental" && (
              <span
                aria-hidden="true"
                title={TIER_HINT.experimental}
                className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-inverse/70" : "bg-warning"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
