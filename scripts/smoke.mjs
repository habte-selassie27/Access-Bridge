import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DEMO_DIR = path.join(ROOT, "frontend/src/data/demo");
const DEMOS = ["demo-1", "demo-2", "demo-3"];
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
  }
  ok(`${id}: valid, ${LANGS.length} language outputs`);
}

// 2. Production build output exists.
const dist = path.join(ROOT, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  fail("dist/index.html missing (run npm run build)");
} else {
  ok("dist present");
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
