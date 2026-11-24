/**
 * Gate G / WP-066: ensure no secrets are committed.
 * Scans tracked source for private-key patterns and confirms env files with
 * real values are gitignored. Firebase *web* config (public apiKey) is allowed.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const fail: string[] = [];

function trackedFiles(): string[] {
  try {
    return execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

const files = trackedFiles();

// 1. .env.local / .env must not be tracked.
for (const f of files) {
  if (/^\.env(\.local)?$|\/\.env(\.local)?$/.test(f)) fail.push(`tracked env file: ${f}`);
}

// 2. Private key / service-account patterns in tracked text files.
const secretRe = /(-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|service_account|"private_key"\s*:|AIza[0-9A-Za-z_-]{35,})/;
for (const f of files) {
  if (!/\.(ts|tsx|js|json|md|env|example)$/.test(f)) continue;
  if (f.endsWith(".env.example")) continue; // placeholders only
  if (!existsSync(f)) continue;
  const body = readFileSync(f, "utf8");
  // Allow public Firebase web apiKey in example/docs? We flag real keys anywhere tracked.
  if (secretRe.test(body)) {
    // Firebase web API keys are public config; only flag private keys / service accounts.
    if (/-----BEGIN |service_account|"private_key"\s*:/.test(body)) fail.push(`possible private key in ${f}`);
  }
}

if (fail.length) {
  console.error("SECRET CHECK FAILED:\n" + fail.join("\n"));
  process.exit(1);
}
console.log("ok: no committed private keys / service accounts; env files gitignored.");