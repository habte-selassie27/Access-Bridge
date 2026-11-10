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

export function languageTier(code: string): LanguageTier {
  return getLanguage(code)?.tier || "experimental";
}

export const DEFAULT_LANG: LanguageCode = "en";

/** Languages we have recorded demo output and measured quality for. */
export const MEASURED_LANGS: LanguageCode[] = ["am", "om", "ti"];

export function loadLastLanguage(): LanguageCode {
  try {
    const stored = localStorage.getItem("pastewise-lang");
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
    localStorage.setItem("pastewise-lang", code);
  } catch {
    // ignore
  }
}
