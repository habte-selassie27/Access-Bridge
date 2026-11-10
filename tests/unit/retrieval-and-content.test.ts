import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText, rankChunks, selectRelevantContext, selectRelevantContextFromDocuments } from "../../server/lib/retrieval/chunker.ts";
import { splitParagraphs, splitSentences } from "../../server/lib/translation/segmenter.ts";
import { extractContacts } from "../../server/lib/extractors/entities.ts";
import { verifyGlossary, verifyContacts, valueIsInSource } from "../../server/lib/verify/content-verifier.ts";

const LONG_DOC = Array.from(
  { length: 12 },
  (_, i) =>
    `SECTION ${i + 1}. Applicants must submit a certified transcript of their records. The application fee is ${100 + i} ETB and the deadline for section ${i + 1} is March ${i + 1}, 2027.`
).join("\n\n");

test("chunking", async (t) => {
  await t.test("a short document is one chunk", () => {
    const chunks = chunkText("Just one short paragraph.");
    assert.equal(chunks.length, 1);
  });

  await t.test("a long document is split into several chunks", () => {
    const chunks = chunkText(LONG_DOC, { maxChars: 700 });
    assert.ok(chunks.length > 1, `expected more than one chunk, got ${chunks.length}`);
    for (const chunk of chunks) assert.ok(chunk.text.length <= 1400);
  });

  await t.test("no text is lost when chunking", () => {
    const chunks = chunkText(LONG_DOC, { maxChars: 700 });
    const joined = chunks.map((c) => c.text).join(" ");
    for (const marker of ["SECTION 1", "SECTION 6", "SECTION 12"]) {
      assert.ok(joined.includes(marker), `${marker} was lost`);
    }
  });

  await t.test("a very long single paragraph is split on sentence boundaries", () => {
    const paragraph = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} goes here.`).join(" ");
    const chunks = chunkText(paragraph, { maxChars: 500 });
    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((c) => c.text.length <= 700));
  });
});

test("retrieval", async (t) => {
  await t.test("the chunk that mentions the question is ranked first", () => {
    const chunks = chunkText(LONG_DOC, { maxChars: 700 });
    const ranked = rankChunks("what is the deadline for section 7?", chunks);
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0].text.includes("section 7"));
  });

  await t.test("a question about the fee finds the fee", () => {
    const chunks = chunkText(LONG_DOC, { maxChars: 700 });
    const ranked = rankChunks("how much is the application fee?", chunks);
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0].text.toLowerCase().includes("fee"));
  });

  await t.test("a synonym finds the paragraph without using the same word", () => {
    const chunks = chunkText(LONG_DOC, { maxChars: 700 });
    const ranked = rankChunks("how much does it cost?", chunks);
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0].text.toLowerCase().includes("fee"));
  });

  await t.test("ranking does not depend on word order", () => {
    const chunks = chunkText(LONG_DOC, { maxChars: 700 });
    const first = rankChunks("deadline section 7", chunks)[0];
    const second = rankChunks("section 7 deadline", chunks)[0];
    assert.ok(first?.text.includes("section 7"));
    assert.ok(second?.text.includes("section 7"));
  });

  await t.test("a 200k document fits the explanation chunk budget", () => {
    const long = Array.from(
      { length: 2500 },
      (_, i) => `NOTICE ${i}. The application fee is ${i} ETB and the deadline is March 1, 2027.`
    ).join("\n\n");
    assert.ok(long.length > 200_000);
    const chunks = chunkText(long, { maxChars: 20_000 });
    // 12 is the budget derived from the 200,000-character accepted limit.
    assert.ok(chunks.length <= 12, `expected at most 12 chunks, got ${chunks.length}`);
    assert.ok(
      chunks.map((c) => c.text).join("\n").includes("NOTICE 2499"),
      "the tail of the document was dropped"
    );
  });

  await t.test("the relevant context is a subset, not the whole document", () => {
    const context = selectRelevantContext("deadline for section 3", LONG_DOC, { maxChars: 700, limit: 2 });
    assert.ok(context.usedChunks <= 2);
    assert.ok(context.context.length < LONG_DOC.length);
    assert.ok(context.chunkCount > 1);
  });

  await t.test("a short document is returned whole", () => {
    const context = selectRelevantContext("anything", "A short notice.");
    assert.equal(context.context, "A short notice.");
    assert.equal(context.usedChunks, 1);
  });

  await t.test("several documents can be searched together", () => {
    const context = selectRelevantContextFromDocuments("what is the deadline?", [
      { title: "Scholarship 2027", text: "The deadline for the scholarship is March 15, 2027." },
      { title: "Job posting", text: "The deadline for the job application is April 30, 2027. Send your CV." },
    ]);
    assert.ok(context.context.includes("Scholarship 2027"));
    assert.ok(context.context.includes("Job posting"));
  });
});

test("sentence and paragraph splitting", async (t) => {
  await t.test("paragraphs are split on blank lines", () => {
    const parts = splitParagraphs("First one.\n\nSecond one.\n\nThird one.");
    assert.equal(parts.length, 3);
    assert.equal(parts[0].text, "First one.");
  });

  await t.test("sentences are split on sentence-ending punctuation", () => {
    const parts = splitSentences("This is one. This is two! And this is three?");
    assert.equal(parts.length, 3);
  });

  await t.test("a decimal number is not a sentence end", () => {
    const parts = splitSentences("The fee is 300.50 ETB. The deadline is March 15.");
    assert.equal(parts.length, 2);
    assert.ok(parts[0].text.includes("300.50"));
  });

  await t.test("an abbreviation is not a sentence end", () => {
    const parts = splitSentences("See Fig. 3 for the details. The deadline is May 1.");
    assert.equal(parts.length, 2);
  });

  await t.test("empty text gives no segments", () => {
    assert.equal(splitSentences("   ").length, 0);
    assert.equal(splitParagraphs("").length, 0);
  });
});

test("contact extraction", async (t) => {
  const doc =
    "For questions, email admissions@example.edu or call +251 911 234 567. The office is at Bole Road, Addis Ababa. See www.example.edu/apply for details.";

  await t.test("an email address is found", () => {
    const contacts = extractContacts(doc);
    assert.ok(contacts.some((c) => c.kind === "email" && c.value === "admissions@example.edu"));
  });

  await t.test("a phone number is found", () => {
    const contacts = extractContacts(doc);
    assert.ok(contacts.some((c) => c.kind === "phone" && c.value.includes("911")));
  });

  await t.test("a website is found", () => {
    const contacts = extractContacts(doc);
    assert.ok(contacts.some((c) => c.kind === "website" && c.value.includes("example.edu")));
  });

  await t.test("an address is found", () => {
    const contacts = extractContacts(doc);
    assert.ok(
      contacts.some((c) => c.kind === "address" && /Bole Road/.test(c.value)),
      `expected an address, got ${JSON.stringify(contacts.map((c) => c.value))}`
    );
  });

  await t.test("a sentence is not an address", () => {
    const contacts = extractContacts(
      "The office is open from Monday to Friday, 8:30am to 4:30pm. SECTION 9: SUPPORT Applicants should contact us."
    );
    assert.equal(contacts.filter((c) => c.kind === "address").length, 0);
  });

  await t.test("the same contact is not returned twice", () => {
    const contacts = extractContacts(doc);
    const emails = contacts.filter((c) => c.kind === "email");
    assert.equal(emails.length, 1);
  });

  await t.test("a document without contacts yields none", () => {
    assert.equal(extractContacts("Nothing here at all.").length, 0);
  });
});

test("content verification", async (t) => {
  const source = "Applicants must provide verifiable proof of enrollment at an accredited institution. Contact admissions@example.edu.";

  await t.test("a glossary entry with a real quote is kept", () => {
    const entries = verifyGlossary(
      [{ term: "accredited institution", meaning: "A school the government recognises.", quote: "at an accredited institution" }],
      source
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0].term, "accredited institution");
  });

  await t.test("a glossary entry whose term is not in the document is dropped", () => {
    const entries = verifyGlossary(
      [{ term: "municipal bond", meaning: "A loan from the city.", quote: "municipal bond" }],
      source
    );
    assert.equal(entries.length, 0);
  });

  await t.test("a glossary entry with a quote that cannot be found is dropped", () => {
    const entries = verifyGlossary(
      [{ term: "accredited", meaning: "Recognised.", quote: "somewhere else entirely" }],
      source
    );
    assert.equal(entries.length, 0);
  });

  await t.test("a contact the document does not contain is dropped", () => {
    const contacts = verifyContacts(
      [{ label: "Admissions", value: "wrong@example.com", kind: "email", quote: "wrong@example.com" }],
      source
    );
    // The real address is still found mechanically; the invented one is not.
    assert.equal(
      contacts.filter((c) => c.value === "wrong@example.com").length,
      0
    );
  });

  await t.test("a contact that is in the document is kept", () => {
    const contacts = verifyContacts(
      [{ label: "Admissions", value: "admissions@example.edu", kind: "email", quote: "admissions@example.edu" }],
      source
    );
    assert.equal(contacts.length, 1);
    assert.equal(contacts[0].value, "admissions@example.edu");
  });

  await t.test("contacts found mechanically are added even if the model missed them", () => {
    const contacts = verifyContacts([], source);
    assert.ok(contacts.some((c) => c.kind === "email" && c.value === "admissions@example.edu"));
  });

  await t.test("a value is found in the source regardless of punctuation", () => {
    assert.equal(valueIsInSource("admissions@example.edu", source), true);
    assert.equal(valueIsInSource("admissions@example.com", source), false);
  });

  await t.test("a value that only appears when two lines are joined is rejected", () => {
    const twoLines = "See www.example.edu/apply.\n\nSECTION 8 follows.";
    assert.equal(valueIsInSource("www.example.edu/apply.SECTION", twoLines), false);
  });
});

test("sanitising keeps the document readable", async (t) => {
  const { sanitizeText } = await import("../../server/lib/security/input-guard.ts");

  await t.test("line breaks survive", () => {
    assert.equal(sanitizeText("one\ntwo\n\nthree"), "one\ntwo\n\nthree");
  });

  await t.test("other control characters are removed", () => {
    assert.equal(sanitizeText("a bc"), "a b c");
  });

  await t.test("the text is trimmed", () => {
    assert.equal(sanitizeText("  hello  "), "hello");
  });
});
