export interface Language {
  code: "am" | "om" | "ti" | "en";
  name: string;
  script: "latin" | "ethiopic";
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", script: "latin" },
  { code: "am", name: "አማርኛ", script: "ethiopic" },
  { code: "om", name: "Afaan Oromoo", script: "latin" },
  { code: "ti", name: "ትግርኛ", script: "ethiopic" },
];

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function isEthiopic(code: LanguageCode): boolean {
  return LANGUAGES.find((l) => l.code === code)?.script === "ethiopic";
}

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.name || code;
}

export const DEFAULT_LANG: LanguageCode = "en";

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
