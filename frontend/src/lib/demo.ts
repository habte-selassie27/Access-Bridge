// Client-side demo resolution. The three demo documents ship with the app so
// the demo works with no server, no network and no API keys (AGENTS.md invariant).
// Demo JSON proposes the explanation (summary, actions, dates, amounts); the
// verification badges are computed here from the bundled source text, using the
// same deterministic checks as the live /api/explain path. The JSON cannot mark
// a field as verified.
import demo1 from "../data/demo/demo-1.json";
import demo2 from "../data/demo/demo-2.json";
import demo3 from "../data/demo/demo-3.json";
import demo4 from "../data/demo/demo-4.json";
import type { ExplanationResult } from "./api/types.ts";
import { hydrateExplanation } from "./verification.ts";

const DOCS = [demo1, demo2, demo3, demo4] as unknown as Array<{
  id: string;
  docType: string;
  source: string;
  outputs: Record<string, any>;
}>;

export const DEMO_IDS: string[] = DOCS.map((d) => d.id);

function toResult(doc: (typeof DOCS)[number], output: any, lang: string): ExplanationResult {
  const source: string = doc.source;
  const { deadlines, costs, confidence, warnings } = hydrateExplanation(source, {
    deadlines: output.deadlines || [],
    costs: output.costs || [],
    confidence: output.confidence,
  });

  // Actions are prose, not checkable facts: they carry no evidence and never
  // get a verified badge.
  const actions = (output.actions || []).map((a: any, i: number) => ({
    id: a.id || `act_${i}`,
    step: a.step,
    urgent: Boolean(a.urgent),
    evidence: null,
  }));

  return {
    docType: output.docType || doc.docType,
    summary: output.summary,
    actions,
    eligibility: output.eligibility || [],
    howToApply: output.howToApply || [],
    deadlines,
    costs,
    documentsToBring: output.documentsToBring || [],
    sections: output.sections || [],
    glossary: output.glossary || [],
    contacts: output.contacts || [],
    examples: output.examples || [],
    level: output.level || "standard",
    confidence,
    warnings: Array.from(new Set([...(output.warnings || []), ...warnings])),
    lang: (output.lang || lang) as ExplanationResult["lang"],
    originalLanguage: (output.lang || lang) as ExplanationResult["lang"],
    originalText: output.originalText || source,
    demoId: doc.id,
  };
}

/**
 * Resolve a bundled demo example, ignoring any legacy `id:lang` suffix.
 *
 * Returns null when the requested language has no recorded output. Falling
 * back to the English text would show an English explanation under an
 * Amharic, Swahili or Arabic label, which is exactly the kind of quiet
 * mistranslation this product exists to prevent.
 */
export function resolveDemo(demoId: string, lang: string): ExplanationResult | null {
  const baseId = demoId.split(":")[0];
  const doc = DOCS.find((d) => d.id === baseId);
  if (!doc) return null;
  const output = doc.outputs[lang];
  if (!output) return null;
  return toResult(doc, output, lang);
}
