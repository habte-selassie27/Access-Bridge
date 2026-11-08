import { Router } from "express";
import { inc } from "../lib/observability/metrics.ts";
import { newRequestId } from "../lib/utils/ids.ts";

const router = Router();
router.post("/tts", (req, res) => {
  const requestId = newRequestId();
  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ ok: false, error: "text required.", retryable: false, code: "INVALID_INPUT" });
    }
    inc("tts_requests");
    return res.json({ ok: true, fallback: "webspeech", supported: false, meta: { requestId, version: "1.0" } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});
export default router;
