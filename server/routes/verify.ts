import { Router } from "express";
import { hydrateFromResult } from "../../frontend/src/lib/verification.ts";
import { noCache } from "../middleware/request-logger.ts";
import { newRequestId } from "../lib/utils/ids.ts";

const router = Router();
router.use(noCache);

router.post("/verify", (req, res) => {
  const requestId = newRequestId();
  try {
    const { sourceText, result } = req.body || {};
    if (typeof sourceText !== "string") {
      return res.status(400).json({ ok: false, error: "sourceText required.", retryable: false, code: "INVALID_INPUT" });
    }

    // Verification is deterministic: the source text decides, never the model.
    // `hydrateFromResult` accepts both the raw model shape and the UI shape,
    // so a real deadline is never reported as missing just because the field
    // names differ.
    const hydrated = hydrateFromResult(sourceText, result ?? {});

    const items = [
      ...hydrated.deadlines.map((d) => ({
        id: d.id,
        type: "deadline",
        verified: d.verified,
        quote: d.evidence?.quote ?? null,
        warning: d.warning,
      })),
      ...hydrated.costs.map((c) => ({
        id: c.id,
        type: "cost",
        verified: c.verified,
        quote: c.evidence?.quote ?? null,
        warning: c.warning,
      })),
    ];
    const verifiedCount = items.filter((i) => i.verified).length;

    return res.json({
      ok: true,
      data: {
        items,
        verifiedCount,
        needCheckCount: items.length - verifiedCount,
        confidence: hydrated.confidence,
        warnings: hydrated.warnings,
      },
      meta: { requestId, version: "1.0" },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
