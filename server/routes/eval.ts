import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

const router = Router();

/**
 * Adaption's own quality report, when the build script has fetched it.
 *
 * This is kept separate from PasteWise's deterministic A/B results: one is the
 * sponsor's report on its dataset, the other is our harness on held-out
 * documents. They are never merged into a single number.
 */
function readSponsorReport(): Record<string, unknown> {
  const file = path.join(process.cwd(), "data", "adaption", "evaluation.json");
  if (!fs.existsSync(file)) {
    return {
      available: false,
      reason: "Not fetched yet. Run: npx tsx scripts/adaption-evaluate.ts",
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    return { available: true, ...parsed };
  } catch {
    return { available: false, reason: "The saved Adaption evaluation file could not be read." };
  }
}

router.get("/eval", (_req, res) => {
  const resultsPath = path.join(process.cwd(), "data", "eval", "results.json");
  const sponsor = readSponsorReport();
  let payload: unknown = null;
  if (fs.existsSync(resultsPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
    } catch {
      payload = null;
    }
  }
  if (payload && typeof payload === "object") {
    return res.json({
      ok: true,
      data: { ...payload, measured: true, sponsor },
      meta: { version: "1.0", measured: true, sponsor: sponsor.available === true },
    });
  }
  return res.json({
    ok: true,
    data: { measured: false, languages: {}, failures: [], sponsor },
    meta: { version: "1.0", measured: false, sponsor: sponsor.available === true },
  });
});

export default router;
