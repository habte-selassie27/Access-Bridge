import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DEMO_DIR = path.join(ROOT, "frontend/src/data/demo");
const DEMOS = ["demo-1", "demo-2", "demo-3", "demo-4"];
const LANGS = ["en", "am", "om", "ti"];
let failures = 0;

function fail(msg) {
  console.error("FAIL:", msg);
  failures += 1;
}

function ok(msg) {
  console.log("ok:", msg);
}

// 1. Demo files exist and are valid JSON with the expected structure.
for (const id of DEMOS) {
  const file = path.join(DEMO_DIR, `${id}.json`);
  if (!fs.existsSync(file)) {
    fail(`missing demo file ${file}`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail(`${id}.json is not valid JSON: ${e.message}`);
    continue;
  }
  for (const lang of LANGS) {
    const out = data.outputs?.[lang];
    if (!out) {
      fail(`${id}: missing output for ${lang}`);
      continue;
    }
    for (const field of ["summary", "actions", "deadlines", "costs", "documentsToBring", "lang", "originalText"]) {
      if (!(field in out)) fail(`${id}:${lang} missing field ${field}`);
    }
    for (const field of ["eligibility", "howToApply"]) {
      if (!(field in out)) fail(`${id}:${lang} missing field ${field}`);
    }
  }
  ok(`${id}: valid, ${LANGS.length} language outputs`);
}

// 2. Recorded demo readouts exist, in public/ and in the build (Listen must not 404).
let audioFailures = 0;
for (const id of DEMOS) {
  for (const lang of ["am", "en"]) {
    for (const dir of ["frontend/public", "frontend/dist"]) {
      const file = path.join(ROOT, dir, "audio", `${id}-${lang}.mp3`);
      if (!fs.existsSync(file)) {
        fail(`missing demo audio ${dir}/audio/${id}-${lang}.mp3`);
        audioFailures += 1;
      }
    }
  }
}
if (audioFailures === 0) ok("demo audio present (am, en) in public and build");

// 3. Production build output exists (vite builds into frontend/dist).
const dist = path.join(ROOT, "frontend/dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  fail("dist/index.html missing (run npm run build)");
} else {
  ok("dist present");
}

// 4. Every workspace screen exists and is routed from the app shell.
const screens = [
  "Dashboard",
  "Assistant",
  "Library",
  "Reader",
  "Translate",
  "Simplify",
  "Voice",
  "Actions",
  "Opportunity",
  "Compare",
  "Settings",
];
const screensDir = path.join(ROOT, "frontend/src/screens");
for (const screen of screens) {
  const file = path.join(screensDir, `${screen}.tsx`);
  if (!fs.existsSync(file)) {
    fail(`missing screen ${screen}.tsx`);
    continue;
  }
  const app = fs.readFileSync(path.join(ROOT, "frontend/src/App.tsx"), "utf8");
  if (!app.includes(`screens/${screen}`)) {
    fail(`${screen}.tsx is not routed from App.tsx`);
  }
}
if (screens.every((s) => fs.existsSync(path.join(screensDir, `${s}.tsx`)))) {
  ok(`${screens.length} workspace screens present and routed`);
}

// 5. The server exposes the new endpoints.
const serverIndex = fs.readFileSync(path.join(ROOT, "server/index.ts"), "utf8");
for (const route of ["import", "eligibility", "compare", "translate", "simplify"]) {
  if (!serverIndex.includes(`./routes/${route}.ts`)) {
    fail(`server route ${route}.ts is not registered`);
  }
}
ok("server routes for import, eligibility, compare, translate and simplify registered");

// 6. The plain-language levels and the accessibility preferences are wired in.
const prompts = fs.readFileSync(path.join(ROOT, "frontend/src/lib/prompts.ts"), "utf8");
for (const level of ["simple", "standard", "detailed"]) {
  if (!prompts.includes(`${level}:`)) fail(`prompt is missing the "${level}" level`);
}
if (!fs.existsSync(path.join(ROOT, "frontend/src/lib/a11y.ts"))) {
  fail("frontend/src/lib/a11y.ts is missing");
}
ok("plain-language levels and accessibility preferences present");

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
