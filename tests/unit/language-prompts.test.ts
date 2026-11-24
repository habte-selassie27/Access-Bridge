import { test } from "node:test";
import assert from "node:assert/strict";

import {
  languageNameForPrompt,
  textLooksInLanguage,
  looksLikeEnglish,
  detectSourceLanguage,
} from "../../frontend/src/lib/languages.ts";
import { languageExampleBlock } from "../../frontend/src/lib/language-examples.ts";
import {
  EXPLAIN_SYSTEM,
  EXPLAIN_USER,
  FOLLOWUP_USER,
  SIMPLIFY_PROMPT,
  ELIGIBILITY_USER,
  COMPARE_USER,
  TRANSLATE_USER,
  GLOSSARY_USER,
} from "../../frontend/src/lib/prompts.ts";

/**
 * Regression: the model used to receive only the ISO code ("am", "ti", "om")
 * and reliably answered in English instead. Prompts must carry a full,
 * unambiguous language name and must explicitly demand the target language.
 */
test("prompt language names are explicit, not bare codes", async (t) => {
  await t.test("Amharic carries the English name and native script", () => {
    const name = languageNameForPrompt("am");
    assert.match(name, /Amharic/);
    assert.match(name, /አማርኛ/);
  });

  await t.test("Tigrinya and Afaan Oromoo are unambiguous", () => {
    assert.match(languageNameForPrompt("ti"), /Tigrinya/);
    assert.match(languageNameForPrompt("ti"), /ትግርኛ/);
    assert.match(languageNameForPrompt("om"), /Afaan Oromoo/);
  });

  await t.test("English stays English", () => {
    assert.equal(languageNameForPrompt("en"), "English");
  });

  await t.test("an unknown code degrades to the code, never to English", () => {
    assert.equal(languageNameForPrompt("xx"), "xx");
  });
});

test("script checks catch an English answer for a non-Latin language", async (t) => {
  await t.test("English text is not accepted as Amharic or Tigrinya", () => {
    assert.equal(textLooksInLanguage("The document is a scholarship notice.", "am"), false);
    assert.equal(textLooksInLanguage("The document is a scholarship notice.", "ti"), false);
  });

  await t.test("Ethiopic text is accepted", () => {
    assert.equal(textLooksInLanguage("ይህ ሰነድ የነገር ማስታወቂያ ነው።", "am"), true);
    assert.equal(textLooksInLanguage("እዚ ሰነድ ሓበሬታ እዩ።", "ti"), true);
  });

  await t.test("Arabic script is checked", () => {
    assert.equal(textLooksInLanguage("This is English.", "ar"), false);
    assert.equal(textLooksInLanguage("هذا مستند رسمي.", "ar"), true);
  });

  await t.test("Latin-script targets reject clearly English output", () => {
    const english = "This document is a resume for Habte Selassie Fitsum, a full-stack software engineer.";
    assert.equal(looksLikeEnglish(english), true);
    assert.equal(textLooksInLanguage(english, "om"), false);
    assert.equal(textLooksInLanguage(english, "sw"), false);
    assert.equal(textLooksInLanguage(english, "fr"), false);
  });

  await t.test("genuine Oromo output is accepted", () => {
    const oromo = "Misoomni fayyaa keessan baay’ee waan dhiyaateef. Faayidaa keessan itti fufuuf haaromsuu qabdu.";
    assert.equal(looksLikeEnglish(oromo), false);
    assert.equal(textLooksInLanguage(oromo, "om"), true);
  });

  await t.test("source-language detection separates English from Oromo", () => {
    assert.equal(detectSourceLanguage("This document is a resume for a software engineer."), "en");
    assert.equal(
      detectSourceLanguage("Misoomni fayyaa keessan baay’ee waan dhiyaateef. Faayidaa keessan itti fufuuf haaromsuu qabdu."),
      "om"
    );
    assert.equal(detectSourceLanguage("ይህ ሰነድ የነገር ማስታወቂያ ነው።"), "am");
  });
});

test("few-shot examples exist for the low-resource measured languages", async (t) => {
  await t.test("Amharic, Oromo and Tigrinya examples show target-language JSON", () => {
    assert.match(languageExampleBlock("am"), /የጤና ኢንሹራንስ/);
    assert.match(languageExampleBlock("om"), /Misoomni fayyaa/);
    assert.match(languageExampleBlock("ti"), /መድሕን ጥዕና/);
  });

  await t.test("English and unmeasured languages do not add an example", () => {
    assert.equal(languageExampleBlock("en"), "");
    assert.equal(languageExampleBlock("sw"), "");
  });
});

test("every explanation prompt names the target language and forbids defaulting to English", async (t) => {
  await t.test("system instruction demands the target language", () => {
    assert.match(EXPLAIN_SYSTEM, /target language/i);
    assert.match(EXPLAIN_SYSTEM, /Do not answer in English unless the target language is English/i);
  });

  await t.test("EXPLAIN_USER includes the full language name", () => {
    const prompt = EXPLAIN_USER({ text: "Deadline: December 15, 2026.", lang: "am" });
    assert.match(prompt, /Target language: Amharic/);
    assert.match(prompt, /Write the summary, actions, eligibility/);
    assert.doesNotMatch(prompt, /Target language: am\n/);
  });

  await t.test("follow-up answers are requested in the selected language", () => {
    const prompt = FOLLOWUP_USER({ docContext: "doc", history: "", question: "When?", lang: "ti" });
    assert.match(prompt, /Answer in Tigrinya/);
    assert.doesNotMatch(prompt, /Answer in ti,/);
  });

  await t.test("simplify keeps the selected language", () => {
    const prompt = SIMPLIFY_PROMPT({ text: "text", lang: "om" });
    assert.match(prompt, /Afaan Oromoo/);
  });

  await t.test("eligibility, compare, translate and glossary keep the selected language", () => {
    assert.match(ELIGIBILITY_USER({ docContext: "d", profile: "p", lang: "am" }), /Answer in Amharic/);
    assert.match(COMPARE_USER({ docA: "a", docB: "b", lang: "ti" }), /Answer in Tigrinya/);
    assert.match(TRANSLATE_USER({ text: "t", lang: "om" }), /into Afaan Oromoo/);
    assert.match(GLOSSARY_USER({ docContext: "d", terms: "", lang: "am" }), /Answer in Amharic/);
  });
});
