import { Router } from "express";
import { parsePublicUrl, resolvesToPublicAddress } from "../lib/security/url-guard.ts";
import { sanitizeText } from "../lib/security/input-guard.ts";
import { newRequestId } from "../lib/utils/ids.ts";
import { noCache } from "../middleware/request-logger.ts";
import { log } from "../lib/observability/logger.ts";

const router = Router();
router.use(noCache);

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 12_000;
const MAX_CHARS = 20_000;

const BLOCKED_CONTENT_TYPES = ["image/", "video/", "audio/", "application/pdf", "application/zip"];

function decodeEntities(html: string): string {
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    });
}

/** Turn an HTML page into readable text without pulling in a parser library. */
export function htmlToText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, " ").trim() : "";

  let working = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(nav|header|footer|aside|form|svg)[\s\S]*?<\/\1>/gi, " ");

  working = working
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ");

  const text = decodeEntities(working)
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return { title, text };
}

router.post("/import", async (req, res) => {
  const requestId = newRequestId();
  try {
    const { url } = req.body || {};
    const parsed = parsePublicUrl(url);
    if (!parsed.ok || !parsed.url) {
      return res.status(400).json({ ok: false, error: parsed.reason || "Invalid link.", retryable: false, code: "INVALID_INPUT" });
    }

    const target = parsed.url;
    const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!(await resolvesToPublicAddress(host))) {
      log("warn", "import blocked: non-public address", { requestId, host });
      return res.status(400).json({ ok: false, error: "That address is not a public website.", retryable: false, code: "BLOCKED_URL" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(target.toString(), {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "AccessBridge/1.0 (+accessibility demo; contact: via app)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
        },
      });
    } catch {
      return res.status(502).json({ ok: false, error: "We could not open that link. Check the address and try again.", retryable: true, code: "UPSTREAM" });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: `That page returned an error (${response.status}).`, retryable: true, code: "UPSTREAM" });
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (BLOCKED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      return res.status(415).json({ ok: false, error: "That link is not a web page we can read. Paste the text instead.", retryable: false, code: "UNSUPPORTED_MIME" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return res.status(413).json({ ok: false, error: "That page is too large to import. Paste the relevant text instead.", retryable: false, code: "FILE_TOO_LARGE" });
    }

    const html = buffer.toString("utf8");
    const { title, text } = htmlToText(html);
    if (!text) {
      return res.status(422).json({ ok: false, error: "We could not find readable text on that page. Paste the text instead.", retryable: false, code: "INVALID_INPUT" });
    }

    return res.json({
      ok: true,
      data: {
        url: target.toString(),
        title: title || target.hostname,
        text: sanitizeText(text).slice(0, MAX_CHARS),
        charCount: Math.min(text.length, MAX_CHARS),
      },
      meta: { requestId, version: "1.0" },
    });
  } catch (err) {
    log("error", "import failed", { requestId, err: String(err) });
    return res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
  }
});

export default router;
