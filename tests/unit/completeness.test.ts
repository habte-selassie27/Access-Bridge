import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNextSteps } from "../../frontend/src/lib/recommendations.ts";
import { summarizeConversation } from "../../frontend/src/lib/library.ts";
import type { ExplanationResult } from "../../frontend/src/lib/api/types.ts";

function result(patch: Partial<ExplanationResult> = {}): ExplanationResult {
  return {
    docType: "government_notice",
    summary: "A notice about a service.",
    actions: [],
    eligibility: [],
    howToApply: [],
    deadlines: [],
    costs: [],
    documentsToBring: [],
    sections: [],
    glossary: [],
    contacts: [],
    examples: [],
    level: "standard",
    confidence: "high",
    warnings: [],
    lang: "en",
    originalLanguage: "en",
    originalText: "A notice about a service.",
    ...patch,
  };
}

test("next steps", async (t) => {
  await t.test("an urgent action comes first", () => {
    const steps = buildNextSteps(
      result({
        actions: [
          { id: "a1", step: "Register at the office.", urgent: true, evidence: null },
          { id: "a2", step: "Read the notice.", urgent: false, evidence: null },
        ],
      })
    );
    assert.equal(steps[0].title, "Register at the office.");
    assert.equal(steps[0].priority, "high");
  });

  await t.test("an unverified date is a high-priority check", () => {
    const steps = buildNextSteps(
      result({
        deadlines: [
          {
            id: "d1",
            label: "Application deadline",
            originalValue: "10/05/2019",
            normalizedDate: null,
            calendar: "gregorian",
            deadlineType: "absolute",
            evidence: null,
            verified: false,
            warning: "Check the original document.",
          },
        ],
      })
    );
    assert.ok(steps.some((s) => s.title.includes("Check this date") && s.priority === "high"));
  });

  await t.test("an experimental language is called out", () => {
    const steps = buildNextSteps(result({ lang: "fr", languageQuality: "experimental" }));
    assert.ok(steps.some((s) => s.id === "language_quality" && s.priority === "high"));
  });

  await t.test("the list is bounded and never empty", () => {
    const steps = buildNextSteps(result());
    assert.ok(steps.length >= 1 && steps.length <= 5);
  });

  await t.test("the same step is not repeated", () => {
    const steps = buildNextSteps(
      result({
        warnings: ["Check the original.", "Check the original."],
      })
    );
    const titles = steps.map((s) => s.title);
    assert.equal(new Set(titles).size, titles.length);
  });
});

test("conversation summaries", async (t) => {
  await t.test("the question names the topic and the answer names the finding", () => {
    const summary = summarizeConversation([
      { role: "user", content: "What is the deadline?" },
      { role: "assistant", content: "The deadline is 15 March 2027. Bring your ID." },
    ]);
    assert.match(summary, /What is the deadline\\?/);
    assert.match(summary, /15 March 2027/);
  });

  await t.test("an empty conversation still has a label", () => {
    assert.equal(summarizeConversation([]), "Conversation");
  });
});
