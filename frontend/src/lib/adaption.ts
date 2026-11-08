// Adaption client integration (load-bearing sponsor integration).
// Exact API details must be confirmed against Adaption's current docs.
// This module is a thin, typed stub so the app compiles and runs without
// an Adaption key; real calls are gated behind ADAPTION_API_KEY.

export interface AdaptionDataset {
  id: string;
  name: string;
  language: string;
  size: number;
  createdAt: string;
}

export interface AdaptionEvalResult {
  variant: "baseline" | "adaption";
  language: string;
  fieldAccuracy: number;
  plainLanguageScore: number;
  faithfulness: number;
  failures: string[];
}

const ADAPTION_API_KEY = import.meta.env.VITE_ADAPTION_API_KEY;
const ADAPTION_BASE_URL = import.meta.env.VITE_ADAPTION_BASE_URL || "https://api.adaption.ai";

export function hasAdaptionKey(): boolean {
  return Boolean(ADAPTION_API_KEY);
}

export async function createDataset(
  language: string,
  samples: { source: string; simplified: string }[]
): Promise<AdaptionDataset | null> {
  if (!hasAdaptionKey()) {
    console.warn("Adaption: no API key; dataset creation skipped");
    return null;
  }
  try {
    const res = await fetch(`${ADAPTION_BASE_URL}/datasets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADAPTION_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language, samples }),
    });
    if (!res.ok) throw new Error(`Adaption dataset failed: ${res.status}`);
    return res.json() as Promise<AdaptionDataset>;
  } catch (err) {
    console.error("Adaption dataset error:", err);
    return null;
  }
}

export async function runEval(
  language: string,
  baselineOutputs: unknown[],
  adaptionOutputs: unknown[]
): Promise<AdaptionEvalResult[] | null> {
  if (!hasAdaptionKey()) {
    console.warn("Adaption: no API key; eval skipped");
    return null;
  }
  try {
    const res = await fetch(`${ADAPTION_BASE_URL}/eval/compare`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ADAPTION_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language, baseline: baselineOutputs, adaption: adaptionOutputs }),
    });
    if (!res.ok) throw new Error(`Adaption eval failed: ${res.status}`);
    return res.json() as Promise<AdaptionEvalResult[]>;
  } catch (err) {
    console.error("Adaption eval error:", err);
    return null;
  }
}
