export interface EvalMetrics {
  n: number;
  nMeasured?: number;
  providerErrors?: number;
  schemaValidRate: number | null;
  dateAccuracy: number | null;
  amountAccuracy: number | null;
  verifiedRate: number | null;
  hallucinatedFields: number;
  languageScriptRate: number | null;
}

export interface LanguageEval {
  baseline: EvalMetrics;
  adapted: EvalMetrics;
  delta: {
    dateAccuracy: number | null;
    amountAccuracy: number | null;
    verifiedRate: number | null;
    hallucinatedFields: number;
  };
}

export interface EvalRow {
  seedId: string;
  variant: "baseline" | "adapted";
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

export interface EvalFailure {
  seedId: string;
  lang: string;
  variant: "baseline" | "adapted";
  reasons: string[];
  notMeasured?: boolean;
  summary?: string;
  error?: string;
}

export interface EvalResults {
  schemaVersion?: number;
  measuredRows?: number;
  providerErrors?: number;
  generatedAt: string;
  model: string;
  datasetId: string;
  datasetBuiltAt: string;
  heldOutSeeds: string[];
  fewShotSeeds: string[];
  languages: Record<string, LanguageEval>;
  rows: EvalRow[];
  failures: EvalFailure[];
  measured?: boolean;
}
