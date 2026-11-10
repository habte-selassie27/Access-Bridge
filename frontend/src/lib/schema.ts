import { z } from "zod";

export const LangSchema = z.enum(["en", "am", "om", "ti", "sw", "ar", "fr"]);

/** How plain the explanation should be. */
export const LevelSchema = z.enum(["simple", "standard", "detailed"]);

/** A named part of the document the model pulled out. */
export const SectionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const ExplainResponseSchema = z.object({
  docType: z.enum(["government_notice", "medical", "financial", "school", "other"]),
  summary: z.string().min(1),
  actions: z.array(
    z.object({
      step: z.string().min(1),
      urgent: z.boolean().default(false),
    })
  ),
  /** Who qualifies for the benefit, grant or service. Empty when not stated. */
  eligibility: z.array(z.string().min(1)).default([]),
  /** Where and how to apply. Empty when not stated. */
  howToApply: z.array(z.string().min(1)).default([]),
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
  /** Named parts of the document worth reading on their own. */
  sections: z.array(SectionSchema).default([]),
  /** Plain-language level this explanation was written at. */
  level: LevelSchema.default("standard"),
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
export type Section = z.infer<typeof SectionSchema>;
export type ExplainLevel = z.infer<typeof LevelSchema>;

export const API_ERROR = {
  INVALID_SCHEMA: "INVALID_SCHEMA",
  UPSTREAM: "UPSTREAM",
  DEMO_FALLBACK: "DEMO_FALLBACK",
} as const;
