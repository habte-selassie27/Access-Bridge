import type { APIResponse, APIEnvelope, APIErrorEnvelope, UIError } from "./types.ts";

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function fetchAPI<T>(
  path: string,
  init: RequestInit
): Promise<{ data: T; warning?: string; error?: UIError }> {
  const res = await fetch(`${API_BASE}${path}`, init);

  let envelope: APIResponse<T>;
  try {
    envelope = (await res.json()) as APIResponse<T>;
  } catch {
    return {
      data: null as unknown as T,
      error: { code: "INVALID_RESPONSE", message: "The server returned an invalid response.", retryable: true },
    };
  }

  if (!res.ok || envelope.ok === false) {
    const err = (envelope as APIErrorEnvelope).error;
    return {
      data: null as unknown as T,
      error: {
        code: err?.code || "REQUEST_FAILED",
        message: err?.message || "The request failed.",
        retryable: err?.retryable ?? true,
      },
    };
  }

  return {
    data: (envelope as APIEnvelope<T>).data,
    warning: (envelope as APIEnvelope<T>).warning,
  };
}

export { fetchAPI };
