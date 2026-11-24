/**
 * Firebase AI `Schema` definitions mirroring the Zod schemas in
 * `frontend/src/lib/schema.ts`. Used for structured output so both the
 * on-device (Gemini Nano) and cloud (Gemini) paths return JSON that
 * matches what the deterministic verifier expects.
 */
import { Schema } from "firebase/ai";

export const ExplainJsonSchema = Schema.object({
  properties: {
    docType: Schema.enumString({
      enum: [
        "government_notice", "medical", "financial", "school", "scholarship",
        "job", "internship", "grant", "fellowship", "bootcamp", "form",
        "instructions", "other",
      ],
    }),
    summary: Schema.string(),
    actions: Schema.array({
      items: Schema.object({
        properties: {
          step: Schema.string(),
          urgent: Schema.boolean(),
        },
        optionalProperties: ["urgent"],
      }),
    }),
    eligibility: Schema.array({ items: Schema.string() }),
    howToApply: Schema.array({ items: Schema.string() }),
    deadlines: Schema.array({
      items: Schema.object({
        properties: {
          label: Schema.string(),
          date: Schema.string(),
        },
        optionalProperties: ["date"],
      }),
    }),
    costs: Schema.array({
      items: Schema.object({
        properties: {
          label: Schema.string(),
          amount: Schema.number(),
          currency: Schema.string(),
        },
        optionalProperties: ["amount", "currency"],
      }),
    }),
    documentsToBring: Schema.array({ items: Schema.string() }),
    sections: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          summary: Schema.string(),
        },
      }),
    }),
    glossary: Schema.array({
      items: Schema.object({
        properties: {
          term: Schema.string(),
          meaning: Schema.string(),
          quote: Schema.string(),
        },
        optionalProperties: ["quote"],
      }),
    }),
    contacts: Schema.array({
      items: Schema.object({
        properties: {
          label: Schema.string(),
          value: Schema.string(),
          kind: Schema.enumString({
            enum: ["email", "phone", "address", "website", "person", "organization", "other"],
          }),
          quote: Schema.string(),
        },
        optionalProperties: ["kind", "quote"],
      }),
    }),
    examples: Schema.array({ items: Schema.string() }),
    confidence: Schema.enumString({ enum: ["high", "medium", "low"] }),
    warnings: Schema.array({ items: Schema.string() }),
  },
  optionalProperties: [
    "eligibility", "howToApply", "documentsToBring", "sections", "glossary",
    "contacts", "examples", "warnings",
  ],
});

export const FollowupSchema = null; // follow-up is plain text, not structured

export const TranslateSchema = Schema.object({
  properties: {
    translated: Schema.string(),
  },
});

export const GlossarySchema = Schema.object({
  properties: {
    entries: Schema.array({
      items: Schema.object({
        properties: {
          term: Schema.string(),
          meaning: Schema.string(),
          quote: Schema.string(),
        },
        optionalProperties: ["quote"],
      }),
    }),
    examples: Schema.array({ items: Schema.string() }),
  },
  optionalProperties: ["examples"],
});

export const CompareSchema = Schema.object({
  properties: {
    summary: Schema.string(),
    onlyInA: Schema.array({ items: Schema.string() }),
    onlyInB: Schema.array({ items: Schema.string() }),
    differences: Schema.array({ items: Schema.string() }),
  },
});

export const EligibilitySchema = Schema.object({
  properties: {
    items: Schema.array({
      items: Schema.object({
        properties: {
          criterion: Schema.string(),
          status: Schema.enumString({ enum: ["met", "not_met", "unknown"] }),
          quote: Schema.string(),
          reason: Schema.string(),
        },
        optionalProperties: ["quote", "reason"],
      }),
    }),
    summary: Schema.string(),
  },
});