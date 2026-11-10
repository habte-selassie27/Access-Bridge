import { log } from "../lib/observability/logger.ts";
import { newRequestId } from "../lib/utils/ids.ts";

/**
 * Attaches a request id to every request and logs the outcome (status +
 * latency) once the response finishes. Never logs document contents or
 * personal data — only request metadata.
 */
export function requestLogger(req: any, res: any, next: any): void {
  req.requestId = req.requestId || newRequestId();
  res.set("X-Request-Id", req.requestId);
  const start = Date.now();
  res.on("finish", () => {
    const latency = Date.now() - start;
    const lang = (req.body && req.body.lang) || "-";
    log("info", "request", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      lang,
      status: res.statusCode,
      latencyMs: latency,
    });
  });
  next();
}

/** Mark processing responses as non-cacheable (they may contain derived
 *  document data). Applied to explain / followup / tts. */
export function noCache(_req: any, res: any, next: any): void {
  res.set("Cache-Control", "no-store");
  next();
}
