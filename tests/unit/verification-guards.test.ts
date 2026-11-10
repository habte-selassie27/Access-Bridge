import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteIsTraceable, findQuoteSpan } from "../../server/lib/verify/quote-verifier.ts";
import { parsePublicUrl, isPrivateAddress } from "../../server/lib/security/url-guard.ts";

const DOC =
  "Scholarship Notice 2027. SECTION 1: ELIGIBILITY. Applicants must be enrolled at a recognized university and must have a GPA of 3.0 or above. Applications close on March 15, 2027.";

test("quote traceability", async (t) => {
  await t.test("accepts a quote copied verbatim from the document", () => {
    assert.equal(quoteIsTraceable("must have a GPA of 3.0 or above", DOC), true);
  });

  await t.test("accepts a quote whose spacing differs from the source", () => {
    assert.equal(quoteIsTraceable("Applications close on March 15, 2027.", DOC), true);
  });

  await t.test("rejects a quote the model invented", () => {
    assert.equal(quoteIsTraceable("Applicants must have a minimum CGPA of 4.0", DOC), false);
  });

  await t.test("rejects an empty quote", () => {
    assert.equal(quoteIsTraceable("", DOC), false);
    assert.equal(quoteIsTraceable("   ", DOC), false);
  });

  await t.test("accepts a short quote when it appears verbatim", () => {
    assert.equal(quoteIsTraceable("GPA", DOC), true);
    assert.equal(quoteIsTraceable("March 15", DOC), true);
  });

  await t.test("rejects a short quote that does not appear verbatim", () => {
    // Too short to be matched word by word, and not in the source either.
    assert.equal(quoteIsTraceable("GPA 9", DOC), false);
    assert.equal(quoteIsTraceable("under 25", DOC), false);
  });
});

test("quote span points back at the original text", async (t) => {
  await t.test("finds the exact position of a quote", () => {
    const quote = "Applications close on March 15, 2027.";
    const span = findQuoteSpan(quote, DOC);
    assert.ok(span);
    assert.equal(DOC.slice(span![0], span![1]), quote);
  });

  await t.test("returns null for a quote that is not in the document", () => {
    assert.equal(findQuoteSpan("Applicants must be under 25 years old", DOC), null);
  });
});

test("URL import refuses anything that is not a public web page", async (t) => {
  await t.test("accepts https", () => {
    const result = parsePublicUrl("https://example.org/announcement");
    assert.equal(result.ok, true);
    assert.equal(result.url?.protocol, "https:");
  });

  await t.test("refuses non http protocols", () => {
    assert.equal(parsePublicUrl("file:///etc/passwd").ok, false);
    assert.equal(parsePublicUrl("ftp://example.org/x").ok, false);
    assert.equal(parsePublicUrl("javascript:alert(1)").ok, false);
  });

  await t.test("refuses the loopback and metadata addresses", () => {
    assert.equal(parsePublicUrl("http://127.0.0.1/admin").ok, false);
    assert.equal(parsePublicUrl("http://localhost:3001/").ok, false);
    assert.equal(parsePublicUrl("http://169.254.169.254/latest/meta-data/").ok, false);
    assert.equal(parsePublicUrl("http://[::1]/").ok, false);
  });

  await t.test("refuses credentials in the URL", () => {
    assert.equal(parsePublicUrl("https://user:pass@example.org/").ok, false);
  });

  await t.test("refuses junk", () => {
    assert.equal(parsePublicUrl("").ok, false);
    assert.equal(parsePublicUrl("not a url").ok, false);
    assert.equal(parsePublicUrl(undefined).ok, false);
  });

  await t.test("classifies private addresses", () => {
    assert.equal(isPrivateAddress("10.0.0.1"), true);
    assert.equal(isPrivateAddress("172.16.5.4"), true);
    assert.equal(isPrivateAddress("192.168.1.1"), true);
    assert.equal(isPrivateAddress("169.254.169.254"), true);
    assert.equal(isPrivateAddress("8.8.8.8"), false);
    assert.equal(isPrivateAddress("93.184.216.34"), false);
  });
});
