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
 * Common English function words. Used only to catch the specific failure we
 * saw in production: the model answers in English while the target is a
 * Latin-script language (Afaan Oromoo, Kiswahili, French).
 */
const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "at", "for", "from", "with", "by", "as", "that", "this",
  "these", "those", "it", "its", "you", "your", "we", "our", "they", "their",
  "he", "she", "his", "her", "not", "no", "will", "would", "can", "could",
  "should", "must", "have", "has", "had", "do", "does", "did", "if", "when",
  "before", "after", "about", "more", "than", "then", "there", "here", "which",
  "who", "whom", "whose", "what", "how", "all", "any", "each", "other", "into",
  "over", "under", "between", "during", "without", "within",
]);

export function looksLikeEnglish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  if (words.length < 3) return false;
  const hits = words.filter((w) => ENGLISH_STOPWORDS.has(w)).length;
  return hits >= 2 && hits / words.length >= 0.15;
}

/** Stopword sets for the Latin-script languages this app supports. */
const LATIN_STOPWORDS: Record<string, string[]> = {
  en: [...ENGLISH_STOPWORDS],
  om: [
    "fi", "kan", "akka", "waan", "keessan", "keessaa", "irra", "dura", "booda",
    "hin", "qabu", "qabdu", "ta'u", "jedhu", "godhaa", "argachuuf", "barnoota",
    "gargaarsa", "misoomni", "fayyaa", "waajjira", "birrii", "yeroo", "namoota",
    "isaanii", "itti", "fufuuf", "haaromsuu", "kaffaluu", "dhiyoo", "jiru",
  ],
  sw: [
    "na", "ya", "kwa", "ni", "wa", "za", "la", "katika", "hii", "hiyo", "kama",
    "ili", "kuwa", "huyu", "wake", "yetu", "yako", "zake", "kutoka", "bila",
    "pamoja", "zaidi", "fedha", "tarehe", "watu", "wana", "una", "unaweza",
    "kwenye", "hadi", "baada", "kabla",
  ],
  fr: [
    "le", "la", "les", "des", "du", "de", "et", "est", "sont", "pour", "vous",
    "votre", "vos", "avec", "dans", "sur", "par", "au", "aux", "ce", "cette",
    "ces", "qui", "que", "ne", "pas", "plus", "avant", "apres", "être", "avoir",
    "il", "elle", "ils", "elles", "nous", "je", "un", "une", "au", "sous",
  ],
};

/** Detect a Latin-script language, or null when the text is too short/ambiguous. */
export function detectLatinLanguage(text: string): LanguageCode | null {
  const words = text.toLowerCase().match(/[a-zà-ÿ']+/g) || [];
  if (words.length < 3) return null;
  const scores = Object.entries(LATIN_STOPWORDS)
    .map(([code, list]) => {
      const set = new Set(list);
      return [code, words.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0)] as const;
    })
    .sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = scores[0];
  const second = scores[1]?.[1] ?? 0;
  if (bestScore < 2 || bestScore - second < 1) return null;
  return best as LanguageCode;
}

/**
 * Best-effort source-language label for the original document. Script checks
 * are reliable for Ethiopic/Arabic; Latin-script documents use stopwords and
 * fall back to English when the sample is too short to tell.
 */
export function detectSourceLanguage(text: string): LanguageCode {
  if (/[\u1200-\u137F]/.test(text)) return "am";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  return detectLatinLanguage(text) ?? "en";
}

/**
 * True when the text appears to be written in the requested language.
 * Returns true when the language cannot be checked deterministically, so a
 * missing check never blocks a legitimate answer.
 */
export function textLooksInLanguage(text: string, code: string): boolean {
  if (code === "en") return true;
  const pattern = languageScriptPattern(code);
  if (pattern) return pattern.test(text);
  // Latin-script target: reject clearly English output. Other mismatches are
  // left alone because the stopword signal is weaker for Oromo/Swahili.
  return !looksLikeEnglish(text);
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
