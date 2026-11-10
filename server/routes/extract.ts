import { Router } from "express";
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import { ocr } from "../context.ts";
import { sanitizeText } from "../lib/security/input-guard.ts";
import { chunkText } from "../lib/retrieval/chunker.ts";
import { withTimeout } from "../lib/utils/timeout.ts";
import { LIMITS } from "../lib/config/limits.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";

const router = Router();
router.use(noCache);

/** Text-like files are read directly; only images and PDFs need OCR. */
const TEXT_MIMES = ["text/plain", "application/json", "text/markdown", "text/csv"];
const OCR_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * A long document is kept in full.
 *
 * The old cap of 8,000 characters silently cut the tail off a 30-page
 * announcement — including the deadline. The explanation pipeline now reads a
 * long document in chunks, so there is no reason to throw the rest away.
 */
const MAX_CHARS = 200_000;

function detectLang(text: string): string {
  if (/[\u1200-\u137F]/.test(text)) return "am";
  return "en";
}

router.post("/extract", upload.single("file"), async (req, res) => {
  const requestId = newRequestId();
  try {
    const { text } = req.body || {};
    let sourceText = "";
    let ocrUsed = false;

    if (req.file) {
      const mime = (req.file.mimetype || "").toLowerCase();
      if (TEXT_MIMES.includes(mime) || /\.txt$/i.test(req.file.originalname || "")) {
        // Plain text: no OCR, no provider, no network.
        sourceText = req.file.buffer.toString("utf8");
      } else if (OCR_MIMES.includes(mime)) {
        if (!ocr) {
          return res.status(503).json({ ok: false, error: "OCR unavailable; paste text instead.", retryable: false, code: "UPSTREAM" });
        }
        try {
          const extracted = await withTimeout(
            ocr.extractText(req.file.buffer.toString("base64"), mime) as Promise<string>,
            LIMITS.explainTimeoutMs
          );
          sourceText = extracted;
          ocrUsed = true;
        } catch {
          return res.status(502).json({ ok: false, error: "Could not read the file. Try a clearer image or paste text.", retryable: true, code: "UPSTREAM" });
        }
      } else {
        return res.status(415).json({ ok: false, error: "Unsupported file type. Use TXT, PDF, PNG, JPG or WEBP.", retryable: false, code: "UNSUPPORTED_MIME" });
      }
    } else if (typeof text === "string") {
      sourceText = sanitizeText(text);
    }

    if (!sourceText.trim()) {
      return res.status(400).json({ ok: false, error: "No text or file provided.", retryable: false, code: "INVALID_INPUT" });
    }

    sourceText = sourceText.slice(0, MAX_CHARS);
    const chunks = chunkText(sourceText);
    return res.json({
      ok: true,
      data: {
        text: sourceText,
        sourceLanguage: detectLang(sourceText),
        charCount: sourceText.length,
        ocrUsed,
        /** How many pieces the explanation pipeline will read this document in. */
        chunkCount: chunks.length,
      },
      meta: { requestId, version: "1.0" },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
