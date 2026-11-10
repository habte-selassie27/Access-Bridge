import { Router } from "express";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import { ocr } from "../context.ts";
import { isAllowedMime } from "../lib/security/file-validator.ts";
import { sanitizeText } from "../lib/security/input-guard.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";

const router = Router();
router.use(noCache);

function detectLang(text: string): string {
  if (/[\u1200-\u137F]/.test(text)) return "am";
  return "en";
}

router.post("/extract", upload.single("file"), async (req, res) => {
  const requestId = newRequestId();
  try {
    const { text, mime } = req.body || {};
    let sourceText = "";
    let ocrUsed = false;
    if (req.file) {
      const uploadedMime = req.file.mimetype;
      if (!isAllowedMime(uploadedMime)) {
        return res.status(415).json({ ok: false, error: "Unsupported file type.", retryable: false, code: "UNSUPPORTED_MIME" });
      }
      if (!ocr) {
        return res.status(503).json({ ok: false, error: "OCR unavailable; paste text instead.", retryable: false, code: "UPSTREAM" });
      }
      try {
        const extracted = await withTimeout(ocr.extractText(req.file.buffer.toString("base64"), uploadedMime) as Promise<string>, LIMITS.explainTimeoutMs);
        sourceText = extracted;
        ocrUsed = true;
      } catch (e) {
        return res.status(502).json({ ok: false, error: "Could not read the file.", retryable: true, code: "UPSTREAM" });
      }
    } else if (text) {
      if (typeof text !== "string") {
        return res.status(400).json({ ok: false, error: "text must be a string.", retryable: false, code: "INVALID_INPUT" });
      }
      sourceText = sanitizeText(text).slice(0, 8000);
    } else if (mime) {
      // no-op
    }

    if (mime && !req.file && !text) {
      // allow empty
    }

    if (!sourceText) {
      return res.status(400).json({ ok: false, error: "No text or file provided.", retryable: false, code: "INVALID_INPUT" });
    }

    sourceText = sourceText.slice(0, 8000);
    return res.json({
      ok: true,
      data: { text: sourceText, sourceLanguage: detectLang(sourceText), charCount: sourceText.length, ocrUsed },
      meta: { requestId, version: "1.0" },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;