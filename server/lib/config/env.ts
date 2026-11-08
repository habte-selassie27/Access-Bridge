import dotenv from "dotenv";
dotenv.config();
export function validateEnv(): { ok: boolean; missing: string[] } {
  const required: string[] = [];
  const missing = required.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing };
}
export const ENV = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  adaptionApiKey: process.env.ADAPTION_API_KEY || "",
  dailySpendCapUsd: Number(process.env.DAILY_SPEND_CAP_USD || 5),
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
};
