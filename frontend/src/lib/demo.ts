// Client-side demo resolution. The three demo documents ship with the app so
// the demo works with no server, no network and no API keys (AGENTS.md invariant).
// Demo JSON is stored in the older server shape; map it to ExplanationResult here.
import demo1 from "../data/demo/demo-1.json";
import demo2 from "../data/demo/demo-2.json";
import demo3 from "../data/demo/demo-3.json";
import type { ExplanationResult } from "./api/types.ts";

const DOCS = [demo1, demo2, demo3] as unknown as Array<{
  id: string;
  docType: string;
  source: string;
  outputs: Record<string, any>;
}>;

export const DEMO_IDS: string[] = DOCS.map((d) => d.id);

function evidenceFor(span: unknown, source: string, verified: boolean) {
  if (!Array.isArray(span) || span.length !== 2) return null;
  const [start, end] = span as [number, number];
  if (start < 0 || end > source.length || start >= end) return null;
  return {
    sourceSpan: [start, end] as [number, number],
    quote: source.slice(start, end),
    verification: (verified ? "verified" : "unverified") as "verified" | "unverified",
  };
}

function toResult(doc: (typeof DOCS)[number], output: any, lang: string): ExplanationResult {
  const source: string = doc.source;
  const deadlines = (output.deadlines || []).map((d: any, i: number) => ({
    id: d.id || `dl_${i}`,
    label: d.label,
    originalValue: d.date ?? null,
    normalizedDate: d.date ?? null,
    calendar: "gregorian" as const,
    deadlineType: (d.date ? "absolute" : "unknown") as "absolute" | "unknown",
    evidence: evidenceFor(d.sourceSpan, source, Boolean(d.verified)),
    verified: Boolean(d.verified),
    warning: d.verified ? null : "Check the original document.",
  }));
  const costs = (output.costs || []).map((c: any, i: number) => ({
    id: c.id || `cost_${i}`,
    label: c.label,
    originalValue: c.amount != null ? `${c.currency || "ETB"} ${c.amount}` : "",
    amount: c.amount ?? null,
    currency: c.currency || "ETB",
    evidence: evidenceFor(c.sourceSpan, source, Boolean(c.verified)),
    verified: Boolean(c.verified),
    warning: c.verified ? null : "Check the original document.",
  }));
  const actions = (output.actions || []).map((a: any, i: number) => ({
    id: a.id || `act_${i}`,
    step: a.step,
    urgent: Boolean(a.urgent),
    evidence: evidenceFor(a.sourceSpan, source, true),
  }));

  return {
    docType: output.docType || doc.docType,
    summary: output.summary,
    actions,
    deadlines,
    costs,
    documentsToBring: output.documentsToBring || [],
    confidence: output.confidence || "medium",
    warnings: output.warnings || [],
    lang: (output.lang || lang) as ExplanationResult["lang"],
    originalLanguage: (output.lang || lang) as ExplanationResult["lang"],
    originalText: output.originalText || source,
    demoId: doc.id,
  };
}

/** Resolve a bundled demo example, ignoring any legacy `id:lang` suffix. */
export function resolveDemo(demoId: string, lang: string): ExplanationResult | null {
  const baseId = demoId.split(":")[0];
  const doc = DOCS.find((d) => d.id === baseId);
  if (!doc) return null;
  const output = doc.outputs[lang] || doc.outputs.en;
  if (!output) return null;
  return toResult(doc, output, lang);
}
