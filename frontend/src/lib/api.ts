import type { ExplainResponse, FollowupResponse } from "./schema.ts";
import { ExplainResponseSchema, FollowupResponseSchema, API_ERROR } from "./schema.ts";

export interface ApiError {
  code: string;
  message: string;
}

export class AccessBridgeApiError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "AccessBridgeApiError";
  }
}

const DEMO_DOCS: Record<string, ExplainResponse> = {};

export function registerDemo(docId: string, response: ExplainResponse): void {
  DEMO_DOCS[docId] = response;
}

export function getDemo(docId: string): ExplainResponse | undefined {
  return DEMO_DOCS[docId];
}

async function fetchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new AccessBridgeApiError(API_ERROR.UPSTREAM, `Server error ${res.status}`);
  }
  const envelope = (await res.json()) as { ok?: boolean; data?: T; error?: string };
  if (envelope.ok === false) {
    throw new AccessBridgeApiError(API_ERROR.UPSTREAM, envelope.error || "Server returned an error.");
  }
  if (!envelope.data) {
    throw new AccessBridgeApiError(API_ERROR.INVALID_SCHEMA, "Server returned no data.");
  }
  return envelope.data;
}

export async function explain({
  text,
  file,
  mime,
  lang,
  demoId,
}: {
  text?: string;
  file?: string;
  mime?: string;
  lang: string;
  demoId?: string;
}): Promise<{ data: ExplainResponse; error?: ApiError }> {
  // Demo mode: fully client-side, no network, no API keys.
  if (demoId && DEMO_DOCS[demoId]) {
    return { data: DEMO_DOCS[demoId] };
  }

  try {
    const data = await fetchJson<ExplainResponse>("/api/explain", { text, file, mime, lang, demoId });
    const parsed = ExplainResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new AccessBridgeApiError(API_ERROR.INVALID_SCHEMA, "Server returned invalid schema");
    }
    return { data: parsed.data };
  } catch (err) {
    if (err instanceof AccessBridgeApiError) {
      return { data: DEMO_DOCS[Object.keys(DEMO_DOCS)[0]]!, error: { code: err.code, message: err.message } };
    }
    return {
      data: DEMO_DOCS[Object.keys(DEMO_DOCS)[0]]!,
      error: { code: API_ERROR.UPSTREAM, message: "Unable to reach the server; using demo fallback." },
    };
  }
}

export async function followup({
  docContext,
  history,
  question,
  lang,
}: {
  docContext: string;
  history: { role: string; content: string }[];
  question: string;
  lang: string;
}): Promise<{ data: FollowupResponse; error?: ApiError }> {
  try {
    const data = await fetchJson<FollowupResponse>("/api/followup", {
      docContext,
      history,
      question,
      lang,
    });
    const parsed = FollowupResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new AccessBridgeApiError(API_ERROR.INVALID_SCHEMA, "Invalid follow-up response");
    }
    return { data: parsed.data };
  } catch (err) {
    return {
      data: {
        answer: "I'm unable to reach the server right now. Please ask the document issuer directly.",
        lang: lang as any,
      },
      error: { code: API_ERROR.UPSTREAM, message: "Follow-up unavailable." },
    };
  }
}

export async function tts({ text, lang }: { text: string; lang: string }): Promise<{ audio?: Blob; fallback?: "webspeech" }> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error("tts failed");
    return { audio: await res.blob() };
  } catch {
    return { fallback: "webspeech" };
  }
}

export async function health(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("/api/health");
    return res.ok ? (res.json() as Promise<{ ok: boolean }>) : { ok: false };
  } catch {
    return { ok: false };
  }
}
