// Single place where proposed deadlines/amounts are turned into shown facts.
//
// The model (or a bundled demo file) only *proposes* labels, dates and amounts.
// Whether a field is shown as verified is decided here, by the deterministic
// checks in verify.ts against the source text. Nothing may pass a `verified`
// flag in: callers cannot grant verification, only the source can.
import { isRelativeDeadline, verifyCost, verifyDeadline } from "./verify.ts";
import type { Cost, Deadline, Evidence } from "./api/types.ts";

export type Confidence = "high" | "medium" | "low";

export interface ProposedDeadline {
  id?: string;
  label?: string;
  date?: string | null;
}

export interface ProposedCost {
  id?: string;
  label?: string;
  amount?: number | null;
  currency?: string | null;
}

export interface HydratedExplanation {
  deadlines: Deadline[];
  costs: Cost[];
  confidence: Confidence;
  warnings: string[];
  verifiedCount: number;
  unverifiedCount: number;
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
const FROM_RANK: Confidence[] = ["low", "medium", "high"];

/** Locate the matched source text so the UI can highlight the exact words. */
function evidenceFor(source: string, matchedSource: string | null): Evidence | null {
  if (!matchedSource) return null;
  const quote = matchedSource.trim();
  if (!quote) return null;
  const start = source.indexOf(quote);
  if (start < 0) return null;
  return {
    sourceSpan: [start, start + quote.length],
    quote,
    verification: "verified",
  };
}

export function hydrateExplanation(
  source: string,
  proposed: {
    deadlines?: ProposedDeadline[];
    costs?: ProposedCost[];
    confidence?: string;
  }
): HydratedExplanation {
  const proposedConfidence =
    proposed.confidence === "high" || proposed.confidence === "low" || proposed.confidence === "medium"
      ? proposed.confidence
      : "medium";

  const deadlines: Deadline[] = (proposed.deadlines ?? []).map((d, i) => {
    const date = typeof d.date === "string" && d.date.trim() ? d.date : null;
    const check = verifyDeadline(date, source);
    const evidence = check.verified ? evidenceFor(source, check.matchedSource) : null;
    // Fail closed: no traceable source text means no "verified" badge, even if
    // the date parser thinks it found a match.
    const verified = check.verified && evidence !== null;
    const relative = date !== null && isRelativeDeadline(date);

    return {
      id: d.id || `dl_${i}`,
      label: d.label || "Deadline",
      originalValue: date,
      normalizedDate: date,
      calendar: verified ? "gregorian" : "unknown",
      deadlineType: relative ? "relative" : date ? "absolute" : "unknown",
      evidence,
      verified,
      warning: verified
        ? null
        : evidence === null && check.verified
          ? "Could not find this date in the original text."
          : check.warning,
    };
  });

  const costs: Cost[] = (proposed.costs ?? []).map((c, i) => {
    const amount = typeof c.amount === "number" && Number.isFinite(c.amount) ? c.amount : null;
    const currency = c.currency || "ETB";
    const check = verifyCost(amount ?? undefined, currency, source);
    const evidence = check.verified ? evidenceFor(source, check.matchedSource) : null;
    const verified = check.verified && evidence !== null;

    return {
      id: c.id || `cost_${i}`,
      label: c.label || "Cost",
      originalValue: amount !== null ? `${currency} ${amount}` : "",
      amount,
      currency,
      evidence,
      verified,
      warning: verified
        ? null
        : evidence === null && check.verified
          ? "Could not find this amount in the original text."
          : check.warning,
    };
  });

  const fields = [...deadlines, ...costs];
  const verifiedCount = fields.filter((f) => f.verified).length;
  const unverifiedCount = fields.length - verifiedCount;

  // A partially verified document can never call itself "high" confidence, and
  // a caller may lower confidence but never raise it.
  const derived: Confidence =
    fields.length === 0 ? proposedConfidence : verifiedCount === fields.length ? "high" : verifiedCount > 0 ? "medium" : "low";
  const confidence = FROM_RANK[Math.min(RANK[proposedConfidence], RANK[derived])];

  const warnings = Array.from(
    new Set(fields.filter((f) => f.warning).map((f) => f.warning as string))
  );

  return { deadlines, costs, confidence, warnings, verifiedCount, unverifiedCount };
}

/**
 * Hydrate a result that has already been shaped for the UI.
 *
 * `/api/explain` returns deadlines as `originalValue` / `normalizedDate` and
 * costs with a numeric `amount`. `hydrateExplanation` expects the raw
 * proposed shape (`date`). This bridges the two so a date that IS in the
 * source is never reported as "no deadline stated" just because the field
 * names differ.
 */
export function hydrateFromResult(
  source: string,
  result: {
    deadlines?: Array<{ id?: string; label?: string; originalValue?: string | null; normalizedDate?: string | null; date?: string | null }>;
    costs?: Array<{ id?: string; label?: string; amount?: number | null; currency?: string | null }>;
    confidence?: string;
  }
): HydratedExplanation {
  return hydrateExplanation(source, {
    deadlines: (result.deadlines ?? []).map((d) => ({
      id: d.id,
      label: d.label,
      date: d.originalValue ?? d.normalizedDate ?? d.date ?? null,
    })),
    costs: (result.costs ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      amount: c.amount ?? null,
      currency: c.currency ?? null,
    })),
    confidence: result.confidence,
  });
}
