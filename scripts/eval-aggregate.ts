// Deterministic aggregation for the baseline-vs-adapted evaluation.
//
// A provider failure (rate limit, network error, upstream 5xx) says nothing
// about model quality. Such rows are excluded from metric denominators and
// reported as "not measured" instead of being scored as schema failures.

export type Variant = "baseline" | "adapted";

export interface EvalRow {
  seedId: string;
  variant: Variant;
  lang: string;
  schemaValid: boolean;
  dateAccuracy: number | null;
  amountAccuracy: number | null;
  verifiedRate: number | null;
  hallucinatedFields: number;
  languageScriptOk: boolean;
  error?: string;
  rawSummary?: string;
}

export interface EvalMetrics {
  n: number;
  nMeasured: number;
  providerErrors: number;
  schemaValidRate: number | null;
  dateAccuracy: number | null;
  amountAccuracy: number | null;
  verifiedRate: number | null;
  hallucinatedFields: number;
  languageScriptRate: number | null;
}

export interface EvalFailure {
  seedId: string;
  lang: string;
  variant: Variant;
  reasons: string[];
  notMeasured?: boolean;
  summary?: string;
  error?: string;
}

const PROVIDER_ERROR_PATTERNS: RegExp[] = [
  /\b429\b/,
  /rate[\s-]?limit/i,
  /quota/i,
  /fetch failed/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up/i,
  /network (?:error|failure)/i,
  /\b(?:groq|openai|anthropic|google|gemini|provider|upstream)\b[^\n]{0,40}\b5\d\d\b/i,
  /\b(?:502|503|504)\b[^\n]{0,40}(?:bad gateway|unavailable|timeout|gateway)/i,
  /timed? ?out/i,
];

export function isProviderError(error?: string): boolean {
  if (!error) return false;
  return PROVIDER_ERROR_PATTERNS.some((re) => re.test(error));
}

export type RowStatus = "ok" | "schema_invalid" | "provider_error";

export function rowStatus(row: EvalRow): RowStatus {
  if (isProviderError(row.error)) return "provider_error";
  return row.schemaValid ? "ok" : "schema_invalid";
}

const round = (n: number) => Math.round(n * 1000) / 1000;

function mean(values: (number | null)[]): number | null {
  const xs = values.filter((v): v is number => typeof v === "number");
  return xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

function deltaOf(a: number | null, b: number | null): number | null {
  return typeof a === "number" && typeof b === "number" ? round(a - b) : null;
}

export function buildLanguageMetrics(
  rows: EvalRow[],
  langs: readonly string[]
): Record<string, { baseline: EvalMetrics; adapted: EvalMetrics; delta: Record<string, number | null> }> {
  const out: Record<string, { baseline: EvalMetrics; adapted: EvalMetrics; delta: Record<string, number | null> }> = {};

  for (const lang of langs) {
    out[lang] = { baseline: emptyMetrics(), adapted: emptyMetrics(), delta: {} };
    for (const variant of ["baseline", "adapted"] as const) {
      const subset = rows.filter((r) => r.lang === lang && r.variant === variant);
      const measured = subset.filter((r) => rowStatus(r) !== "provider_error");
      out[lang][variant] = {
        n: subset.length,
        nMeasured: measured.length,
        providerErrors: subset.length - measured.length,
        schemaValidRate: mean(measured.map((r) => (r.schemaValid ? 1 : 0))),
        dateAccuracy: mean(measured.map((r) => r.dateAccuracy)),
        amountAccuracy: mean(measured.map((r) => r.amountAccuracy)),
        verifiedRate: mean(measured.map((r) => r.verifiedRate)),
        hallucinatedFields: measured.reduce((n, r) => n + r.hallucinatedFields, 0),
        languageScriptRate: mean(measured.map((r) => (r.languageScriptOk ? 1 : 0))),
      };
    }
    out[lang].delta = {
      dateAccuracy: deltaOf(out[lang].adapted.dateAccuracy, out[lang].baseline.dateAccuracy),
      amountAccuracy: deltaOf(out[lang].adapted.amountAccuracy, out[lang].baseline.amountAccuracy),
      verifiedRate: deltaOf(out[lang].adapted.verifiedRate, out[lang].baseline.verifiedRate),
      hallucinatedFields: out[lang].adapted.hallucinatedFields - out[lang].baseline.hallucinatedFields,
    };
  }

  return out;
}

function emptyMetrics(): EvalMetrics {
  return {
    n: 0,
    nMeasured: 0,
    providerErrors: 0,
    schemaValidRate: null,
    dateAccuracy: null,
    amountAccuracy: null,
    verifiedRate: null,
    hallucinatedFields: 0,
    languageScriptRate: null,
  };
}

export function buildFailures(rows: EvalRow[]): EvalFailure[] {
  return rows
    .filter((r) => rowStatus(r) !== "ok" || r.hallucinatedFields > 0 || !r.languageScriptOk)
    .map((r) => {
      const notMeasured = rowStatus(r) === "provider_error";
      return {
        seedId: r.seedId,
        lang: r.lang,
        variant: r.variant,
        reasons: notMeasured
          ? ["not measured: provider error (rate limit or network)"]
          : [
              !r.schemaValid ? "schema invalid" : null,
              r.hallucinatedFields ? `${r.hallucinatedFields} unverified field(s)` : null,
              !r.languageScriptOk ? "wrong script/language" : null,
            ].filter((x): x is string => Boolean(x)),
        notMeasured,
        summary: r.rawSummary,
        error: r.error,
      };
    })
    .sort((a, b) => Number(a.notMeasured) - Number(b.notMeasured));
}
