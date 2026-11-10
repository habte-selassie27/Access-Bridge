const GEEZ_MAP: Record<string, string> = {
  "፩": "1", "፪": "2", "፫": "3", "፬": "4", "፭": "5",
  "፮": "6", "፯": "7", "፰": "8", "፱": "9", "፲": "10",
  "፳": "30", "፴": "40", "፵": "50", "፶": "60", "፷": "70",
  "፸": "80", "፹": "90", "፺": "100", "፻": "100", "፼": "10000",
};

function geezToArabic(s: string): string {
  let out = "";
  for (const ch of s) {
    out += GEEZ_MAP[ch] ?? ch;
  }
  return out;
}

export function normalizeSource(text: string): string {
  return text
    .replace(/\u200f|\u200e/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeDigits(text: string): string {
  return geezToArabic(text);
}

export function normalizeDateSeparators(text: string): string {
  return text.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-").replace(/\u2044/g, "/");
}

export function normalize(text: string): string {
  return normalizeDigits(normalizeDateSeparators(normalizeSource(text)));
}

// Non-global regexes for parsing (avoid shared lastIndex state).
const ISO_DATE_NG = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
const SHORT_DATE_NG = /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/;
const MONTH_DATE_NG = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i;
// "15 January 2027" — day first, month name second. Official notices in
// Ethiopia and most of the world write dates this way.
const DAY_MONTH_DATE_NG = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})/i;

// Global regexes for finding spans.
const ISO_DATE_G = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g;
const SHORT_DATE_G = /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/g;
const MONTH_DATE_G = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/gi;
const DAY_MONTH_DATE_G = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})/gi;

const RELATIVE = /within\s+\d+\s+days?\s+of\s+receipt/i;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseDateCandidate(s: string): Date | null {
  const m1 = s.match(ISO_DATE_NG);
  if (m1) {
    const [, y, mo, d] = m1;    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt;
  }
  const m2 = s.match(MONTH_DATE_NG);
  if (m2) {
    const mm = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/i.exec(m2[0]);
    if (mm) {
      const mon = MONTHS[mm[1].toLowerCase()];
      const day = /\d{1,2}/.exec(m2[0])?.[0];
      const yr = /\d{4}/.exec(m2[0])?.[0];
      if (mon && day && yr) {
        const dt = new Date(Number(yr), mon - 1, Number(day));
        if (!isNaN(dt.getTime())) return dt;
      }
    }
  }
  // Day first: "15 January 2027".
  const mDay = s.match(DAY_MONTH_DATE_NG);
  if (mDay) {
    const [, day, monthName, year] = mDay;
    const mon = MONTHS[monthName.toLowerCase()];
    if (mon) {
      const dt = new Date(Number(year), mon - 1, Number(day));
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  // Short date: assume day/month/year or month/day/year? Try as given (d/m/y) then (m/d/y).
  const m3 = s.match(SHORT_DATE_NG);
  if (m3) {
    const [, a, b, y] = m3;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    // Try day/month/year
    const dt1 = new Date(year, Number(b) - 1, Number(a));
    if (!isNaN(dt1.getTime()) && dt1.getDate() === Number(a)) return dt1;
  }
  return null;
}

export function findDateSpans(source: string): { text: string; start: number; end: number; date: Date }[] {
  const norms = normalize(source);
  const results: { text: string; start: number; end: number; date: Date }[] = [];
  const collectors: { re: RegExp; parse: (m: string) => Date | null }[] = [
    { re: ISO_DATE_G, parse: (m) => parseDateCandidate(m) },
    { re: SHORT_DATE_G, parse: (m) => parseDateCandidate(m) },
    { re: MONTH_DATE_G, parse: (m) => parseDateCandidate(m) },
    { re: DAY_MONTH_DATE_G, parse: (m) => parseDateCandidate(m) },
  ];
  for (const { re, parse } of collectors) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(norms)) !== null) {
      const parsed = parse(m[0]);
      if (parsed) {
        const span = { text: m[0], start: m.index, end: m.index + m[0].length, date: parsed };
        // Dedup: skip if overlapping an already-added span.
        const overlaps = results.some((r) => !(span.end <= r.start || span.start >= r.end));
        if (!overlaps) results.push(span);
      }
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return results;
}

export function isRelativeDeadline(text: string): boolean {
  return RELATIVE.test(text);
}

const AMOUNT_G = /(?:ETB|birr|Birr|\$|USD|EUR|GBP)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g;

export function findAmountSpans(source: string): { text: string; start: number; end: number; amount: number; currency: string }[] {
  const norms = normalize(source);
  const results: { text: string; start: number; end: number; amount: number; currency: string }[] = [];
  AMOUNT_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AMOUNT_G.exec(norms)) !== null) {
    const raw = m[1].replace(/,/g, "");
    const amount = Number(raw);
    if (!Number.isFinite(amount)) {
      if (m[0].length === 0) AMOUNT_G.lastIndex++;
      continue;
    }
    const prefix = m[0].slice(0, m[0].length - m[1].length).trim();
    let currency = "ETB";
    if (/USD|\$/.test(prefix)) currency = "USD";
    else if (/EUR/.test(prefix)) currency = "EUR";
    else if (/GBP/.test(prefix)) currency = "GBP";
    results.push({ text: m[0], start: m.index, end: m.index + m[0].length, amount, currency });
    if (m[0].length === 0) AMOUNT_G.lastIndex++;
  }
  return results;
}

function datesEqual(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export interface VerifyDeadlineResult {
  verified: boolean;
  matchedSource: string | null;
  warning: string | null;
}

export function verifyDeadline(candidate: string | null, source: string): VerifyDeadlineResult {
  if (!candidate) {
    return { verified: false, matchedSource: null, warning: "No deadline stated." };
  }
  if (isRelativeDeadline(candidate)) {
    return { verified: false, matchedSource: null, warning: "Relative deadline; check the original." };
  }
  const parsed = parseDateCandidate(candidate);
  if (!parsed) {
    return { verified: false, matchedSource: null, warning: "Could not parse date." };
  }
  const spans = findDateSpans(source);
  const match = spans.find((s) => datesEqual(s.date, parsed));
  if (!match) {
    return { verified: false, matchedSource: null, warning: "Date not found in source." };
  }
  return { verified: true, matchedSource: match.text, warning: null };
}

export interface VerifyCostResult {
  verified: boolean;
  matchedSource: string | null;
  warning: string | null;
}

export function verifyCost(candidateAmount: number | undefined, candidateCurrency: string, source: string): VerifyCostResult {
  if (candidateAmount === undefined) {
    return { verified: false, matchedSource: null, warning: "No amount stated." };
  }
  const spans = findAmountSpans(source);
  const match = spans.find((s) => s.amount === candidateAmount && s.currency === candidateCurrency);
  if (!match) {
    return { verified: false, matchedSource: null, warning: "Amount not found in source." };
  }
  return { verified: true, matchedSource: match.text, warning: null };
}

export function sumAmounts(amounts: number[]): number {
  let total = 0;
  for (const a of amounts) total += a;
  return Math.round(total * 100) / 100;
}

export function runVerification(
  deadlines: { label: string; date: string | null }[],
  costs: { label: string; amount: number | undefined; currency: string }[],
  source: string
) {
  const verifiedDeadlines = deadlines.map((d) => ({ ...d, ...verifyDeadline(d.date, source) }));
  const verifiedCosts = costs.map((c) => ({ ...c, ...verifyCost(c.amount, c.currency, source) }));
  const warnings = [
    ...verifiedDeadlines.filter((d) => d.warning).map((d) => d.warning!),
    ...verifiedCosts.filter((c) => c.warning).map((c) => c.warning!),
  ];
  return { verifiedDeadlines, verifiedCosts, warnings };
}
