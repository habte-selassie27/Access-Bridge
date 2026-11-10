// Last-resort offline output for the three bundled examples.
//
// This is deliberately narrow: it is used only when the network call fails AND
// the input text matches a bundled example exactly. A live document never gets
// another document's explanation (AGENTS.md invariant).
import { exampleByText } from "./examples.ts";
import { resolveDemo } from "./demo.ts";
import type { ExplanationResult } from "./api/types.ts";

export function offlineDemoResult(text: string, lang: string): ExplanationResult | null {
  const example = exampleByText(text);
  if (!example) return null;
  const result = resolveDemo(example.id, lang);
  if (!result) return null;
  return { ...result, offlineDemo: true };
}
