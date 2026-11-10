// Example documents ship with the app so the demo never needs a network call to
// *show* a sample. They are only text: clicking one fills the input, and the
// normal /api/explain pipeline runs exactly as it does for a pasted document.
import demo1 from "../data/demo/demo-1.json";
import demo2 from "../data/demo/demo-2.json";
import demo3 from "../data/demo/demo-3.json";

export type ExampleKey = "government" | "medical" | "financial";

export interface Example {
  key: ExampleKey;
  /** Bundled demo id, used only by the offline fallback. */
  id: string;
  type: "government_notice" | "medical" | "financial";
  title: string;
  description: string;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    key: "government",
    id: demo1.id,
    type: "government_notice",
    title: "Government notice",
    description: "Health insurance renewal notice with deadline and fee.",
    text: demo1.source,
  },
  {
    key: "medical",
    id: demo2.id,
    type: "medical",
    title: "Medical document",
    description: "Medical appointment notice with date and documents to bring.",
    text: demo2.source,
  },
  {
    key: "financial",
    id: demo3.id,
    type: "financial",
    title: "Financial document",
    description: "School fee notice with amount and payment deadline.",
    text: demo3.source,
  },
];

export function exampleByKey(key: ExampleKey): Example | undefined {
  return EXAMPLES.find((example) => example.key === key);
}

/** Match pasted text back to a bundled example. Whitespace and case are
 *  normalised so a copy/paste round-trip still matches; wording never is. */
export function exampleByText(text: string): Example | undefined {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
  const target = normalize(text);
  if (!target) return undefined;
  return EXAMPLES.find((example) => normalize(example.text) === target);
}
