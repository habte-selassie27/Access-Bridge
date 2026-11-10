import { fetchAPI } from "./client.ts";
import { offlineDemoResult } from "../fallbackResults.ts";
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
  warning?: string;
  error?: { code: string; message: string; retryable: boolean };
}> {
  if (req.demoId) {
    const resolved = resolveDemo(req.demoId, req.lang);
    if (resolved) return { data: resolved };
  }
  const form = new FormData();
  form.append("lang", req.lang);
  if (req.demoId) form.append("demoId", req.demoId);
  if (req.file) {
    form.append("file", req.file, req.file.name);
  } else {
    form.append("text", req.text ?? "");
  }

  let response: { data: ExplanationResult; warning?: string; error?: { code: string; message: string; retryable: boolean } };
  try {
    response = await fetchAPI<ExplanationResult>("/api/explain", {
      method: "POST",
      body: form,
    });
  } catch {
    response = {
      data: null as unknown as ExplanationResult,
      error: {
        code: "NETWORK",
        message: "We could not reach the server. Check your connection and try again.",
        retryable: true,
      },
    };
  }

  if (response.error) {
    // Offline demo promise: only an exact bundled example falls back to its
    // saved explanation, and the UI labels it. Real documents fail honestly.
    if (!req.file && req.text) {
      const fallback = offlineDemoResult(req.text, req.lang);
      if (fallback) {
        return { data: fallback, warning: "You appear to be offline. Showing the saved example result." };
      }
    }
    return { data: null as unknown as ExplanationResult, error: response.error };
  }

  return response;
}
