export const LIMITS = {
  /** A pasted or extracted document may be long; the explainer chunks it. */
  maxTextLength: Number(process.env.MAX_TEXT_LENGTH || 200_000),
  /** A single prompt (translation, comparison, eligibility) stays bounded. */
  maxPromptTextLength: Number(process.env.MAX_PROMPT_TEXT_LENGTH || 20_000),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_MB || 8) * 1024 * 1024,
  explainTimeoutMs: 40000,
  ttsTimeoutMs: 10000,
  followupTimeoutMs: 15000,
  maxHistoryMessages: 10,
} as const;
