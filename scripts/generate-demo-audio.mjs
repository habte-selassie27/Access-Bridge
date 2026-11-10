// Generate the cached readout MP3s for the bundled demo documents.
//
// Browser speechSynthesis has no Amharic/Oromo/Tigrinya voices on most devices,
// so the demo would be silent. This script pre-renders the readout for each demo
// document and writes it to frontend/public/audio/<id>-<lang>.mp3, where
// ListenButton picks it up (see frontend/src/lib/demo-audio.ts).
//
// Usage: node scripts/generate-demo-audio.mjs [lang ...]   (default: am)
// Requires network access. Re-run after editing demo copy, then commit the MP3s.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, "..");
const DEMO_DIR = path.join(ROOT, "frontend/src/data/demo");
const OUT_DIR = path.join(ROOT, "frontend/public/audio");
const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ["am"];
const MAX_CHARS = 180;

function readoutText(output) {
  const parts = [output.summary, ...(output.actions || []).map((a) => a.step)];
  return parts.filter(Boolean).join(". ");
}

function chunk(text, size = MAX_CHARS) {
  const sentences = text.split(/(?<=[.!?።])\s+/);
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (!sentence) continue;
    if ((current + " " + sentence).trim().length > size) {
      if (current) chunks.push(current.trim());
      if (sentence.length > size) {
        let rest = sentence;
        while (rest.length > size) {
          chunks.push(rest.slice(0, size));
          rest = rest.slice(size);
        }
        current = rest;
        continue;
      }
      current = sentence;
    } else {
      current = (current ? current + " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// curl rather than Node fetch: undici connect timeouts here, curl reaches the host fine.
async function tts(text, lang) {
  const url = new URL("https://translate.google.com/translate_tts");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("tl", lang);
  url.searchParams.set("q", text);
  const tmp = path.join(os.tmpdir(), `pw-tts-${process.pid}-${Math.random().toString(36).slice(2)}.mp3`);
  try {
    await run("curl", [
      "-sSf",
      "--max-time",
      "60",
      "-A",
      "Mozilla/5.0",
      "-o",
      tmp,
      url.toString(),
    ]);
    const buf = await readFile(tmp);
    if (buf.length < 1000) throw new Error(`TTS ${lang} returned ${buf.length} bytes (not audio)`);
    return buf;
  } finally {
    await rm(tmp, { force: true });
  }
}

await mkdir(OUT_DIR, { recursive: true });

let failures = 0;
for (const lang of LANGS) {
  for (const id of ["demo-1", "demo-2", "demo-3", "demo-4"]) {
    const doc = JSON.parse(await readFile(path.join(DEMO_DIR, `${id}.json`), "utf8"));
    const output = doc.outputs?.[lang];
    if (!output) {
      console.log(`skip ${id} ${lang}: no copy`);
      continue;
    }
    const text = readoutText(output);
    const parts = [];
    for (const piece of chunk(text)) {
      try {
        parts.push(await tts(piece, lang));
      } catch (err) {
        failures++;
        console.error(`${id} ${lang}: ${err.message}`);
      }
    }
    if (!parts.length) continue;
    const out = path.join(OUT_DIR, `${id}-${lang}.mp3`);
    await writeFile(out, Buffer.concat(parts));
    console.log(`${path.relative(ROOT, out)}  ${(Buffer.concat(parts).length / 1024).toFixed(0)} KB`);
  }
}

if (failures) {
  console.error(`\n${failures} chunk(s) failed. Files may be incomplete.`);
  process.exit(1);
}
