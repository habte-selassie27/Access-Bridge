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
  "Auth",
  "History",
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
for (const route of ["import", "eligibility", "compare", "translate", "simplify", "auth"]) {
  if (!serverIndex.includes(`./routes/${route}.ts`)) {
    fail(`server route ${route}.ts is not registered`);
  }
}
ok("server routes for import, eligibility, compare, translate, simplify and auth registered");

// 6. Long documents are chunked rather than truncated, and questions are
// answered from the whole document.
for (const file of [
  "server/lib/retrieval/chunker.ts",
  "server/lib/translation/segmenter.ts",
  "server/lib/extractors/entities.ts",
  "server/lib/verify/content-verifier.ts",
  "server/lib/providers/tts/tts.adapter.ts",
]) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`${file} is missing`);
}
const extract = fs.readFileSync(path.join(ROOT, "server/routes/extract.ts"), "utf8");
if (!/MAX_CHARS = 200_000/.test(extract)) {
  fail("the extract route still truncates long documents");
}
const chunker = fs.readFileSync(path.join(ROOT, "server/lib/retrieval/chunker.ts"), "utf8");
if (!chunker.includes("cosineSimilarity") || !chunker.includes("embedText")) {
  fail("retrieval is not vector-based");
}
if (!chunker.includes("DEFAULT_OVERLAP")) fail("the chunk overlap is not exported");
const explain = fs.readFileSync(path.join(ROOT, "server/lib/services/explain.service.ts"), "utf8");
if (/MAX_CHUNKS = \d+/.test(explain) || !explain.includes("LIMITS.maxTextLength")) {
  fail("the explain chunk budget is not derived from the accepted document limit");
}
const tts = fs.readFileSync(path.join(ROOT, "server/lib/providers/tts/tts.adapter.ts"), "utf8");
if (!tts.includes("TTS_BASE_URL") || !tts.includes('"local"')) {
  fail("the keyless local TTS provider is missing");
}
ok("vector chunking covers the accepted document limit; keyless TTS is configured");

// 7. The plain-language levels and the accessibility preferences are wired in.
const prompts = fs.readFileSync(path.join(ROOT, "frontend/src/lib/prompts.ts"), "utf8");
for (const level of ["simple", "standard", "detailed"]) {
  if (!prompts.includes(`${level}:`)) fail(`prompt is missing the "${level}" level`);
}
if (!fs.existsSync(path.join(ROOT, "frontend/src/lib/a11y.ts"))) {
  fail("frontend/src/lib/a11y.ts is missing");
}
if (!fs.existsSync(path.join(ROOT, "frontend/src/lib/auth.ts"))) {
  fail("frontend/src/lib/auth.ts is missing");
}
if (!fs.existsSync(path.join(ROOT, "frontend/src/screens/Auth.tsx"))) {
  fail("frontend/src/screens/Auth.tsx is missing");
}
if (!fs.existsSync(path.join(ROOT, "server/lib/auth/store.ts"))) {
  fail("server/lib/auth/store.ts is missing");
}
ok("plain-language levels, accessibility preferences and server accounts present");

// 8. The result carries the opportunity type, the glossary and the contacts.
const schema = fs.readFileSync(path.join(ROOT, "frontend/src/lib/schema.ts"), "utf8");
for (const kind of ["scholarship", "job", "internship", "grant", "fellowship", "bootcamp"]) {
  if (!schema.includes(`"${kind}"`)) fail(`the document type "${kind}" is missing`);
}
for (const field of ["glossary", "contacts", "examples", "sections"]) {
  if (!schema.includes(field)) fail(`the schema is missing "${field}"`);
}
ok("opportunity types, glossary, contacts and examples in the schema");

// 9. Completeness checks: warnings, original file, translation quality,
// motion/density, skip link, next steps, history and Adaption coverage.
const overview = fs.readFileSync(path.join(ROOT, "frontend/src/components/result/DocumentOverview.tsx"), "utf8");
if (!overview.includes("result.warnings.map")) fail("DocumentOverview does not render the actual warning text");
if (!overview.includes("Translation quality")) fail("DocumentOverview has no per-result translation-quality row");
for (const file of [
  "frontend/src/lib/original-file.ts",
  "frontend/src/components/evidence/OriginalFileViewer.tsx",
  "frontend/src/lib/recommendations.ts",
  "frontend/src/components/result/NextStepsCard.tsx",
  "frontend/src/components/result/DocTypeGuidance.tsx",
  "frontend/src/screens/History.tsx",
  "server/lib/services/adaption-memory.service.ts",
  "scripts/adaption-evaluate.ts",
]) {
  if (!fs.existsSync(path.join(ROOT, file))) fail(`${file} is missing`);
}
const a11y = fs.readFileSync(path.join(ROOT, "frontend/src/lib/a11y.ts"), "utf8");
for (const setting of ["motion", "density"]) {
  if (!a11y.includes(setting)) fail(`the accessibility settings are missing "${setting}"`);
}
for (const shell of ["frontend/src/components/layout/AppShell.tsx", "frontend/src/components/layout/WorkspaceLayout.tsx"]) {
  const source = fs.readFileSync(path.join(ROOT, shell), "utf8");
  if (!source.includes("skip-link")) fail(`${shell} has no skip-to-content link`);
}
const historyScreen = fs.readFileSync(path.join(ROOT, "frontend/src/screens/History.tsx"), "utf8");
if (!historyScreen.includes("convo.summary")) fail("History does not show conversation summaries");
const library = fs.readFileSync(path.join(ROOT, "frontend/src/screens/Library.tsx"), "utf8");
if (library.includes("listConversations")) fail("Library still contains the History tab instead of a separate page");
const translate = fs.readFileSync(path.join(ROOT, "server/routes/translate.ts"), "utf8");
if (!translate.includes("retrieveTranslationMemory")) fail("translation does not use the Adaption translation memory");
const evalRoute = fs.readFileSync(path.join(ROOT, "server/routes/eval.ts"), "utf8");
if (!evalRoute.includes("adaption")) fail("the eval route does not expose the Adaption report");
const evalOverview = fs.readFileSync(path.join(ROOT, "frontend/src/components/eval/EvalOverview.tsx"), "utf8");
for (const role of [
  "Seed corpus and dataset build",
  "Multilingual few-shot examples",
  "Live translation memory (retrieval)",
  "Dataset quality report",
  "OCR for photos and PDFs",
  "Speech in and out",
]) {
  if (!evalOverview.includes(role)) fail(`/eval is missing the provider audit role "${role}"`);
}
ok("warnings, original file, translation quality, a11y preferences, skip link, next steps, history and the six-role audit present");

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
