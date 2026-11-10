import dotenv from "dotenv";
import { log } from "../observability/logger.ts";

dotenv.config();

/** Variables the app must have to start. None are provider keys: demo mode
 *  must run offline with no credentials. */
const REQUIRED: string[] = [];

/** Provider / integration keys. The app runs in demo mode without them, but
 *  we warn at startup so operators know live processing is unavailable. */
const OPTIONAL: string[] = [
  "GROQ_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "ADAPTION_API_KEY",
];

export function validateEnv(): { ok: boolean; missing: string[]; warnings: string[] } {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  const warnings = OPTIONAL.filter((k) => !process.env[k]).map((k) => `Missing optional ${k}; demo mode only.`);
  return { ok: missing.length === 0, missing, warnings };
}

const { ok, missing, warnings } = validateEnv();
if (!ok) {
  log("error", "Missing required env vars", { missing });
  process.exit(1);
}
for (const w of warnings) {
  log("warn", w);
}

export const ENV = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  adaptionApiKey: process.env.ADAPTION_API_KEY || "",
  dailySpendCapUsd: Number(process.env.DAILY_SPEND_CAP_USD || 5),
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
  demoMode: !process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY,
};
