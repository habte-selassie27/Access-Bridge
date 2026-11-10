import { z } from "zod";

export const LangSchema = z.enum(["en", "am", "om", "ti", "sw", "ar", "fr"]);

/** How plain the explanation should be. */
export const LevelSchema = z.enum(["simple", "standard", "detailed"]);

/** A named part of the document the model pulled out. */
export const SectionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
});

/**
 * What kind of document this is.
 *
 * The opportunity kinds exist because "scholarship" and "job posting" need a
 * different reader: one is about applying, the other is about a role and its
 * requirements. Everything else is a notice, a medical or a financial
 * document.
 */
export const DocTypeSchema = z.enum([
  "government_notice",
  "medical",
  "financial",
  "school",
  "scholarship",
  "job",
  "internship",
  "grant",
  "fellowship",
  "bootcamp",
  "other",
]);

/** The document kinds that describe an opportunity the reader can apply for. */
export const OPPORTUNITY_TYPES = [
  "scholarship",
  "job",
  "internship",
  "grant",
  "fellowship",
  "bootcamp",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export function isOpportunityType(value: unknown): value is OpportunityType {
  return typeof value === "string" && (OPPORTUNITY_TYPES as readonly string[]).includes(value);
}

/** A hard term in the document, explained in plain language. */
export const GlossaryEntrySchema = z.object({
  term: z.string().min(1),
  meaning: z.string().min(1),
  /** Verbatim text from the document that contains the term. */
  quote: z.string().default(""),
});

/** A person, organisation or way to get in touch. */
export const ContactSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  kind: z.enum(["email", "phone", "address", "website", "person", "organization", "other"]).default("other"),
  /** Verbatim text from the document that contains the contact. */
  quote: z.string().default(""),
});

export const ExplainResponseSchema = z.object({
  docType: DocTypeSchema,
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
  /** Hard terms explained in plain language. */
  glossary: z.array(GlossaryEntrySchema).default([]),
  /** People, organisations and ways to get in touch. */
  contacts: z.array(ContactSchema).default([]),
  /** A worked example of how to satisfy one of the requirements. */
  examples: z.array(z.string().min(1)).default([]),
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
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type ExplainLevel = z.infer<typeof LevelSchema>;

export const API_ERROR = {
  INVALID_SCHEMA: "INVALID_SCHEMA",
  UPSTREAM: "UPSTREAM",
  DEMO_FALLBACK: "DEMO_FALLBACK",
} as const;
