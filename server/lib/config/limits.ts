export const LIMITS = {
  maxTextLength: Number(process.env.MAX_TEXT_LENGTH || 20000),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_MB || 8) * 1024 * 1024,
  explainTimeoutMs: 20000,
  ttsTimeoutMs: 10000,
  followupTimeoutMs: 15000,
  maxHistoryMessages: 10,
} as const;
