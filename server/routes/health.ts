import { Router } from "express";
import { llm, ocr, DEMO_INDEX } from "../context.ts";

const router = Router();

// Liveness: the process is up.
router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Readiness: what is configured. A present API key is not proof the provider
// accepts it, so report configuration rather than claiming live processing works.
router.get("/health/ready", (_req, res) => {
  const live = Boolean(llm);
  res.json({
    ok: true,
    mode: live ? "live" : "demo-only",
    llmConfigured: live,
    ocrConfigured: Boolean(ocr),
    providerStatus: live ? "unverified" : "not-configured",
    demoCount: Object.keys(DEMO_INDEX).length,
  });
});

export default router;
