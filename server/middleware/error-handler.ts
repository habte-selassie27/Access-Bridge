import { log } from "../lib/observability/logger.ts";

export function errorHandler(err: any, _req: any, res: any, _next: any): void {
  // Malformed JSON is a client error, not a server fault.
  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    log("warn", "malformed request body", { err: String(err?.message) });
    res.status(400).json({ ok: false, error: "Request body is not valid JSON.", retryable: false, code: "INVALID_INPUT" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ ok: false, error: "Request body is too large.", retryable: false, code: "INVALID_INPUT" });
    return;
  }
  log("error", "unhandled error", { err: String(err) });
  res.status(500).json({ ok: false, error: "Internal server error.", retryable: false, code: "UPSTREAM" });
}
