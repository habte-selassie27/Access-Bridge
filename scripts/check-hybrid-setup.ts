/**
 * Gate B/C pre-flight: is this build actually able to call Firebase AI Logic?
 *
 * Checks the Vite env files that the browser build reads and reports which
 * hybrid settings are present. It never prints a value, so it is safe to paste
 * the output into an issue or the submission notes.
 *
 * Usage: npm run check:hybrid
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Env = Record<string, string>;

function parseEnvFile(path: string): Env {
  const out: Env = {};
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

// Vite reads from the frontend project root; process.env covers shell runs.
const candidates = [
  resolve("frontend/.env.local"),
  resolve("frontend/.env"),
  resolve(".env.local"),
  resolve(".env"),
];

const env: Env = {};
for (const file of candidates) Object.assign(env, parseEnvFile(file));
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("VITE_") && value) env[key] = value;
}

const required = [
  ["VITE_FIREBASE_API_KEY", "Firebase web API key"],
  ["VITE_FIREBASE_PROJECT_ID", "Firebase project id"],
  ["VITE_FIREBASE_APP_ID", "Firebase web app id"],
] as const;

const recommended = [
  ["VITE_FIREBASE_AUTH_DOMAIN", "auth domain"],
  ["VITE_FIREBASE_STORAGE_BUCKET", "storage bucket"],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", "messaging sender id"],
] as const;

const appCheckKeys = ["VITE_FIREBASE_APPCHECK_SITE_KEY", "VITE_FIREBASE_APPCHECK_DEBUG_TOKEN"];

const missing: string[] = [];

console.log("Firebase AI Logic hybrid setup\n");
console.log("Required web config:");
for (const [key, label] of required) {
  const present = Boolean(env[key]);
  if (!present) missing.push(key);
  console.log(`  ${present ? "ok  " : "MISS"} ${key.padEnd(38)} ${label}`);
}

console.log("\nRecommended web config:");
for (const [key, label] of recommended) {
  const present = Boolean(env[key]);
  console.log(`  ${present ? "ok  " : "----"} ${key.padEnd(38)} ${label}`);
}

const appCheck = appCheckKeys.filter((key) => Boolean(env[key]));
console.log("\nApp Check:");
if (appCheck.length === 0) {
  console.log("  MISS no site key or debug token set");
} else {
  for (const key of appCheck) console.log(`  ok   ${key}`);
  if (env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN) {
    console.log("       debug token is for local testing only; use a production attestation key when deployed.");
  }
}

console.log("\nInference settings (optional):");
console.log(`  ${env.VITE_AI_INFERENCE_MODE ? "ok  " : "----"} VITE_AI_INFERENCE_MODE = ${env.VITE_AI_INFERENCE_MODE || "prefer_on_device (default)"}`);
console.log(`  ${env.VITE_AI_CLOUD_MODEL ? "ok  " : "----"} VITE_AI_CLOUD_MODEL = ${env.VITE_AI_CLOUD_MODEL || "gemini-3.5-flash-lite (default)"}`);

if (missing.length > 0) {
  console.error(`\nNot configured: ${missing.join(", ")}.`);
  console.error("Add these to frontend/.env.local (gitignored) and restart the dev server or rebuild.");
  console.error("Then run: npm run dev, open /hybrid-lab, and use Run on-device test.");
  process.exit(1);
}

console.log("\nWeb config is present. This does not prove inference works:");
console.log("  1. Cloud: open /hybrid-lab and run the hybrid eval; every row must report a source.");
console.log("  2. Local: use Run on-device test on Chrome 139+ desktop; expect ON_DEVICE.");
console.log("  3. Offline: repeat step 2 with DevTools offline after the model is downloaded.");
console.log("See docs/LIVE_INFERENCE.md for the full checklist and what to record.");
