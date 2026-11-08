import { fetchAPI } from "./client.ts";
import { resolveDemo } from "../demo.ts";
import type { ExplanationResult } from "./types.ts";

export interface ExplainRequest {
  text?: string;
  file?: File;
  lang: string;
  demoId?: string;
}

export async function explainDocument(req: ExplainRequest): Promise<{
  data: ExplanationResult;
  error?: { code: string; message: string; retryable: boolean };
}> {
  // Demo examples are bundled with the app: no server, no network, no API keys.
  if (req.demoId) {
    const demo = resolveDemo(req.demoId, req.lang);
    if (!demo) {
      return {
        data: null as unknown as ExplanationResult,
        error: { code: "INVALID_INPUT", message: "That example is not available.", retryable: false },
      };
    }
    return { data: demo };
  }

  if (req.file) {
    const form = new FormData();
    form.append("file", req.file);
    form.append("lang", req.lang);
    return fetchAPI<ExplanationResult>("/api/explain", {
      method: "POST",
      body: form,
    });
  }

  return fetchAPI<ExplanationResult>("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: req.text, lang: req.lang }),
  });
}
