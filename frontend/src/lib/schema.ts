import { z } from "zod";

export const LangSchema = z.enum(["am", "om", "ti", "en"]);

export const ExplainResponseSchema = z.object({
  docType: z.enum(["government_notice", "medical", "financial", "school", "other"]),
  summary: z.string().min(1),
  actions: z.array(
    z.object({
      step: z.string().min(1),
      urgent: z.boolean().default(false),
    })
  ),
  deadlines: z.array(
    z.object({
      label: z.string().min(1),
      date: z.string().nullable(),
      sourceSpan: z.tuple([z.number(), z.number()]).optional(),
      verified: z.boolean().default(false),
    })
  ),
  costs: z.array(
    z.object({
      label: z.string().min(1),
      amount: z.number().nonnegative().optional(),
      currency: z.string().default("ETB"),
      sourceSpan: z.tuple([z.number(), z.number()]).optional(),
      verified: z.boolean().default(false),
    })
  ),
  documentsToBring: z.array(z.string().min(1)),
  confidence: z.enum(["high", "medium", "low"]),
  warnings: z.array(z.string()),
  lang: LangSchema,
  originalText: z.string(),
});

export const FollowupResponseSchema = z.object({
  answer: z.string().min(1),
  lang: LangSchema,
});

export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
export type FollowupResponse = z.infer<typeof FollowupResponseSchema>;
export type Action = ExplainResponse["actions"][number];
export type Deadline = ExplainResponse["deadlines"][number];
export type Cost = ExplainResponse["costs"][number];

export const API_ERROR = {
  INVALID_SCHEMA: "INVALID_SCHEMA",
  UPSTREAM: "UPSTREAM",
  DEMO_FALLBACK: "DEMO_FALLBACK",
} as const;
