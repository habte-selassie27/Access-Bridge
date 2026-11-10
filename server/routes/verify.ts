import { Router } from "express";
import { runVerification } from "../../frontend/src/lib/verify.ts";
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
    const deadlines = (result?.deadlines || []).map((d: any) => ({
      label: d.label || d.id || "Deadline",
      date: d.originalValue ?? d.normalizedDate ?? null,
    }));
    const costs = (result?.costs || []).map((c: any) => ({
      label: c.label || c.id || "Cost",
      amount: c.amount ?? undefined,
      currency: c.currency || "ETB",
    }));
    const { verifiedDeadlines, verifiedCosts, warnings } = runVerification(deadlines, costs, sourceText);
    const items = [
      ...verifiedDeadlines.map((d: any, i: number) => ({
        id: result?.deadlines?.[i]?.id ?? `d${i}`,
        type: "deadline",
        verified: Boolean(d.verified),
        quote: d.matchedSource ?? null,
        warning: d.warning ?? null,
      })),
      ...verifiedCosts.map((c: any, i: number) => ({
        id: result?.costs?.[i]?.id ?? `c${i}`,
        type: "cost",
        verified: Boolean(c.verified),
        quote: c.matchedSource ?? null,
        warning: c.warning ?? null,
      })),
    ];
    const verifiedCount = items.filter((i) => i.verified).length;
    return res.json({
      ok: true,
      data: {
        items,
        verifiedCount,
        needCheckCount: items.length - verifiedCount,
        confidence: result?.confidence || "medium",
        warnings,
      },
      meta: { requestId, version: "1.0" },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;