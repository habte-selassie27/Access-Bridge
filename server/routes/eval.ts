import { Router } from "express";

const router = Router();
router.get("/eval", (_req, res) => {
  const results = {
    datasetSize: 18,
    languages: ["am", "om", "ti", "en"],
    categories: ["government_notice", "medical", "financial"],
    lastRun: new Date().toISOString(),
    baseline: { fieldAccuracy: 0.71, plainLanguageScore: 0.62, faithfulness: 0.78 },
    adapted: { fieldAccuracy: 0.84, plainLanguageScore: 0.79, faithfulness: 0.88 },
    failures: [
      "Ambiguous date format DD/MM vs MM/DD",
      "OCR misread on low-quality scan",
      "Relative deadline not computed",
      "Unmatched amount due to currency mismatch",
    ],
    note: "Synthetic evaluation data; not production results.",
  };
  res.json({ ok: true, data: results, meta: { version: "1.0" } });
});
export default router;
