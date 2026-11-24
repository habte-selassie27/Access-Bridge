export type LanguageCode = "en" | "am" | "om" | "ti" | "sw" | "ar" | "fr";

/**
 * How well we can back up a language claim.
 * - `source`      the language the documents arrive in; nothing to translate.
 * - `measured`    evaluated on the /eval page with real numbers.
 * - `experimental` the model can write it, but we have not measured it yet.
 */
export type LanguageTier = "source" | "measured" | "experimental";

export interface Language {
  code: LanguageCode;
  name: string;
  englishName: string;
  script: "latin" | "ethiopic" | "arabic";
  tier: LanguageTier;
  rtl: boolean;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", englishName: "English", script: "latin", tier: "source", rtl: false },
  { code: "am", name: "አማርኛ", englishName: "Amharic", script: "ethiopic", tier: "measured", rtl: false },
  { code: "om", name: "Afaan Oromoo", englishName: "Afaan Oromoo", script: "latin", tier: "measured", rtl: false },
  { code: "ti", name: "ትግርኛ", englishName: "Tigrinya", script: "ethiopic", tier: "measured", rtl: false },
  { code: "sw", name: "Kiswahili", englishName: "Swahili", script: "latin", tier: "experimental", rtl: false },
  { code: "ar", name: "العربية", englishName: "Arabic", script: "arabic", tier: "experimental", rtl: true },
  { code: "fr", name: "Français", englishName: "French", script: "latin", tier: "experimental", rtl: false },
];

export type LanguageCodeT = LanguageCode;

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function isEthiopic(code: string): boolean {
  return getLanguage(code)?.script === "ethiopic";
}

export function isRtl(code: string): boolean {
  return getLanguage(code)?.rtl === true;
}

export function languageName(code: string): string {
  return getLanguage(code)?.name || code;
}

/**
 * Human-readable language label for model prompts.
 *
 * Models reliably ignore bare ISO codes such as "am" or "ti" and fall back to
 * English. Always send the English name plus the native name and script so the
 * target language is unambiguous.
 */
const PROMPT_LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  am: "Amharic (አማርኛ, Ethiopic script)",
  om: "Afaan Oromoo (Latin script)",
  ti: "Tigrinya (ትግርኛ, Ethiopic script)",
  sw: "Kiswahili (Latin script)",
  ar: "Arabic (العربية, Arabic script)",
  fr: "French (Français, Latin script)",
};

export function languageNameForPrompt(code: string): string {
  return PROMPT_LANGUAGE_NAMES[code] || getLanguage(code)?.englishName || code;
}

/**
 * Script check for languages whose writing system is distinctive enough to
 * verify. Latin-script languages return null: we cannot tell Oromo or
 * Swahili from English by code point alone, so we do not pretend to.
 */
export function languageScriptPattern(code: string): RegExp | null {
  if (code === "am" || code === "ti") return /[\u1200-\u137F]/;
  if (code === "ar") return /[\u0600-\u06FF]/;
  return null;
}

/**
 * True when the text appears to be written in the requested language.
 * Returns true when the language cannot be checked deterministically, so a
 * missing check never blocks a legitimate answer.
 */
export function textLooksInLanguage(text: string, code: string): boolean {
  const pattern = languageScriptPattern(code);
  if (!pattern) return true;
  return pattern.test(text);
}

export function languageTier(code: string): LanguageTier {
  return getLanguage(code)?.tier || "experimental";
}

export const DEFAULT_LANG: LanguageCode = "en";

/** Languages we have recorded demo output and measured quality for. */
export const MEASURED_LANGS: LanguageCode[] = ["am", "om", "ti"];

export function loadLastLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem("access-bridge-lang");
    if (stored && LANGUAGES.some((l) => l.code === stored)) {
      return stored as LanguageCode;
    }
  } catch {
    // localStorage unavailable; ignore
  }
  return DEFAULT_LANG;
}

export function saveLastLanguage(code: LanguageCode): void {
  try {
    localStorage.setItem("access-bridge-lang", code);
  } catch {
    // ignore
  }
}
