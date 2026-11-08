import { fetchAPI } from "./client.ts";
import type { FollowUpResponse } from "./types.ts";

export interface FollowUpRequest {
  docContext: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  question: string;
  lang: string;
}

export async function followupQuestion(req: FollowUpRequest): Promise<{
  data: FollowUpResponse;
  warning?: string;
  error?: { code: string; message: string; retryable: boolean };
}> {
  return fetchAPI<FollowUpResponse>("/api/followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
