import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
router.get("/eval", (_req, res) => {
  const resultsPath = path.join(process.cwd(), "eval", "results.json");
  let data;
  if (fs.existsSync(resultsPath)) {
    try { data = JSON.parse(fs.readFileSync(resultsPath, "utf8")); }
    catch { data = null; }
  }
  if (!data) {
    data = { note: "No eval results yet. Run: node scripts/run-eval.mjs" };
  } else {
    data.note = "Real measured results from scripts/run-eval.mjs (Groq gpt-oss-120b). Hallucinated-number rate is the headline metric.";
  }
  res.json({ ok: true, data, meta: { version: "1.0" } });
});
export default router;
